use async_trait::async_trait;
use error_stack::{IntoReport, Result, ResultExt};
use tokio_postgres::GenericClient;
use type_system::DataType;

use crate::{
    identifier::{ontology::OntologyTypeEditionId, GraphElementEditionId},
    ontology::{DataTypeWithMetadata, OntologyElementMetadata, OntologyTypeWithMetadata},
    provenance::{OwnedById, UpdatedById},
    store::{
        crud::Read,
        postgres::{DependencyContext, DependencyStatus},
        AsClient, DataTypeStore, InsertionError, PostgresStore, QueryError, UpdateError,
    },
    subgraph::{edges::GraphResolveDepths, query::StructuralQuery, Subgraph},
};

impl<C: AsClient> PostgresStore<C> {
    /// Internal method to read a [`DataTypeWithMetadata`] into a [`DependencyContext`].
    ///
    /// This is used to recursively resolve a type, so the result can be reused.
    pub(crate) async fn traverse_data_type(
        &self,
        data_type_id: &OntologyTypeEditionId,
        dependency_context: &mut DependencyContext,
        subgraph: &mut Subgraph,
        current_resolve_depth: GraphResolveDepths,
    ) -> Result<(), QueryError> {
        let dependency_status = dependency_context
            .ontology_dependency_map
            .insert(data_type_id, current_resolve_depth);

        let _data_type = match dependency_status {
            DependencyStatus::Unresolved => {
                <Self as Read<DataTypeWithMetadata>>::read_into_subgraph(
                    self,
                    subgraph,
                    data_type_id,
                )
                .await?
            }
            DependencyStatus::Resolved => return Ok(()),
        };

        // TODO: data types currently have no references to other types, so we don't need to do
        //       anything here
        //   see https://app.asana.com/0/1200211978612931/1202464168422955/f

        Ok(())
    }
}

#[async_trait]
impl<C: AsClient> DataTypeStore for PostgresStore<C> {
    async fn create_data_type(
        &mut self,
        data_type: DataType,
        owned_by_id: OwnedById,
        updated_by_id: UpdatedById,
    ) -> Result<OntologyElementMetadata, InsertionError> {
        let transaction = PostgresStore::new(
            self.as_mut_client()
                .transaction()
                .await
                .into_report()
                .change_context(InsertionError)?,
        );

        let (_, metadata) = transaction
            .create(data_type, owned_by_id, updated_by_id)
            .await?;

        transaction
            .client
            .commit()
            .await
            .into_report()
            .change_context(InsertionError)?;

        Ok(metadata)
    }

    async fn get_data_type(
        &self,
        query: &StructuralQuery<DataTypeWithMetadata>,
    ) -> Result<Subgraph, QueryError> {
        let StructuralQuery {
            ref filter,
            graph_resolve_depths,
        } = *query;

        let mut subgraph = Subgraph::new(graph_resolve_depths);
        let mut dependency_context = DependencyContext::default();

        for data_type in Read::<DataTypeWithMetadata>::read(self, filter).await? {
            let data_type_id = data_type.metadata().edition_id().clone();

            // Insert the vertex into the subgraph to avoid another lookup when traversing it
            subgraph
                .vertices
                .data_types
                .insert(data_type_id.clone(), data_type);

            self.traverse_data_type(
                &data_type_id,
                &mut dependency_context,
                &mut subgraph,
                graph_resolve_depths,
            )
            .await?;

            subgraph
                .roots
                .insert(GraphElementEditionId::Ontology(data_type_id));
        }

        Ok(subgraph)
    }

    async fn update_data_type(
        &mut self,
        data_type: DataType,
        updated_by_id: UpdatedById,
    ) -> Result<OntologyElementMetadata, UpdateError> {
        let transaction = PostgresStore::new(
            self.as_mut_client()
                .transaction()
                .await
                .into_report()
                .change_context(UpdateError)?,
        );

        let (_, metadata) = transaction
            .update::<DataType>(data_type, updated_by_id)
            .await?;

        transaction
            .client
            .commit()
            .await
            .into_report()
            .change_context(UpdateError)?;

        Ok(metadata)
    }
}
