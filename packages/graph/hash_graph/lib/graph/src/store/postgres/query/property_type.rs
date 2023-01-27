use std::{borrow::Cow, iter::once};

use super::table::OwnedOntologyMetadata;
use crate::{
    ontology::{PropertyTypeQueryPath, PropertyTypeWithMetadata},
    store::postgres::query::{
        table::{Column, JsonField, PropertyTypes, Relation, TypeIds},
        PostgresQueryPath, PostgresRecord, Table,
    },
};

impl PostgresRecord for PropertyTypeWithMetadata {
    fn base_table() -> Table {
        Table::PropertyTypes
    }
}

impl PostgresQueryPath for PropertyTypeQueryPath {
    fn relations(&self) -> Vec<Relation> {
        match self {
            Self::BaseUri | Self::Version => {
                vec![Relation::PropertyTypeIds]
            }
            Self::OwnedById | Self::UpdatedById => {
                vec![Relation::PropertyTypeOwnedMetadata]
            }
            Self::DataTypes(path) => once(Relation::PropertyTypeDataTypeReferences)
                .chain(path.relations())
                .collect(),
            Self::PropertyTypes(path) => once(Relation::PropertyTypePropertyTypeReferences)
                .chain(path.relations())
                .collect(),
            _ => vec![],
        }
    }

    fn terminating_column(&self) -> Column {
        match self {
            Self::BaseUri => Column::TypeIds(TypeIds::BaseUri),
            Self::Version => Column::TypeIds(TypeIds::Version),
            Self::OwnedById => Column::OwnedOntologyMetadata(OwnedOntologyMetadata::OwnedById),
            Self::UpdatedById => Column::OwnedOntologyMetadata(OwnedOntologyMetadata::UpdatedById),
            Self::VersionId => Column::PropertyTypes(PropertyTypes::VersionId),
            Self::Schema => Column::PropertyTypes(PropertyTypes::Schema(None)),
            Self::VersionedUri => Column::PropertyTypes(PropertyTypes::Schema(Some(
                JsonField::Text(&Cow::Borrowed("$id")),
            ))),
            Self::Title => Column::PropertyTypes(PropertyTypes::Schema(Some(JsonField::Text(
                &Cow::Borrowed("title"),
            )))),
            Self::Description => Column::PropertyTypes(PropertyTypes::Schema(Some(
                JsonField::Text(&Cow::Borrowed("description")),
            ))),
            Self::DataTypes(path) => path.terminating_column(),
            Self::PropertyTypes(path) => path.terminating_column(),
        }
    }
}
