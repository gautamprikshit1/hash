use std::{
    pin::Pin,
    task::{ready, Context, Poll},
};

use error_stack::{IntoReport, Report, ResultExt};
use futures::{
    channel::mpsc::{self, Sender},
    stream::{select_all, BoxStream, SelectAll},
    Sink, SinkExt, Stream, StreamExt,
};
use uuid::Uuid;

use crate::{
    ontology::{CustomOntologyMetadata, OntologyElementMetadata},
    snapshot::{
        account::AccountSender,
        ontology::{
            OntologyExternalMetadataRow, OntologyIdRow, OntologyOwnedMetadataRow,
            OntologyTypeMetadataRowBatch,
        },
        SnapshotRestoreError,
    },
};

#[derive(Debug, Clone)]
pub struct OntologyTypeMetadataSender {
    account: AccountSender,
    id: Sender<OntologyIdRow>,
    owned_metadata: Sender<OntologyOwnedMetadataRow>,
    external_metadata: Sender<OntologyExternalMetadataRow>,
}

impl Sink<(Uuid, OntologyElementMetadata)> for OntologyTypeMetadataSender {
    type Error = Report<SnapshotRestoreError>;

    fn poll_ready(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        ready!(self.account.poll_ready_unpin(cx))
            .attach_printable("could not poll account sender")?;
        ready!(self.id.poll_ready_unpin(cx))
            .into_report()
            .change_context(SnapshotRestoreError::Read)
            .attach_printable("could not poll id sender")?;
        ready!(self.owned_metadata.poll_ready_unpin(cx))
            .into_report()
            .change_context(SnapshotRestoreError::Read)
            .attach_printable("could not poll owned metadata sender")?;
        ready!(self.external_metadata.poll_ready_unpin(cx))
            .into_report()
            .change_context(SnapshotRestoreError::Read)
            .attach_printable("could not poll external metadata sender")?;

        Poll::Ready(Ok(()))
    }

    fn start_send(
        mut self: Pin<&mut Self>,
        (ontology_id, metadata): (Uuid, OntologyElementMetadata),
    ) -> Result<(), Self::Error> {
        let (provenance, temporal_versioning) = match metadata.custom {
            CustomOntologyMetadata::Owned {
                provenance,
                temporal_versioning,
                owned_by_id,
            } => {
                self.owned_metadata
                    .start_send(OntologyOwnedMetadataRow {
                        ontology_id,
                        owned_by_id,
                    })
                    .into_report()
                    .change_context(SnapshotRestoreError::Read)
                    .attach_printable("could not send owned metadata")?;
                (provenance, temporal_versioning)
            }
            CustomOntologyMetadata::External {
                provenance,
                temporal_versioning,
                fetched_at,
            } => {
                self.external_metadata
                    .start_send(OntologyExternalMetadataRow {
                        ontology_id,
                        fetched_at,
                    })
                    .into_report()
                    .change_context(SnapshotRestoreError::Read)
                    .attach_printable("could not send external metadata")?;
                (provenance, temporal_versioning)
            }
        };

        self.account
            .start_send_unpin(provenance.record_created_by_id.as_account_id())
            .attach_printable("could not send account")?;

        self.id
            .start_send(OntologyIdRow {
                ontology_id,
                base_url: metadata.record_id.base_url.as_str().to_owned(),
                version: metadata.record_id.version,
                transaction_time: temporal_versioning.map(|t| t.transaction_time),
                record_created_by_id: provenance.record_created_by_id,
            })
            .into_report()
            .change_context(SnapshotRestoreError::Read)
            .attach_printable("could not send id")?;

        Ok(())
    }

    fn poll_flush(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        ready!(self.account.poll_flush_unpin(cx))
            .attach_printable("could not flush account sender")?;
        ready!(self.id.poll_flush_unpin(cx))
            .into_report()
            .change_context(SnapshotRestoreError::Read)
            .attach_printable("could not flush id sender")?;
        ready!(self.owned_metadata.poll_flush_unpin(cx))
            .into_report()
            .change_context(SnapshotRestoreError::Read)
            .attach_printable("could not flush owned metadata sender")?;
        ready!(self.external_metadata.poll_flush_unpin(cx))
            .into_report()
            .change_context(SnapshotRestoreError::Read)
            .attach_printable("could not flush external metadata sender")?;

        Poll::Ready(Ok(()))
    }

    fn poll_close(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Result<(), Self::Error>> {
        ready!(self.account.poll_close_unpin(cx))
            .attach_printable("could not close account sender")?;
        ready!(self.id.poll_close_unpin(cx))
            .into_report()
            .change_context(SnapshotRestoreError::Read)
            .attach_printable("could not close id sender")?;
        ready!(self.owned_metadata.poll_close_unpin(cx))
            .into_report()
            .change_context(SnapshotRestoreError::Read)
            .attach_printable("could not close owned metadata sender")?;
        ready!(self.external_metadata.poll_close_unpin(cx))
            .into_report()
            .change_context(SnapshotRestoreError::Read)
            .attach_printable("could not close external metadata sender")?;

        Poll::Ready(Ok(()))
    }
}

pub struct OntologyTypeMetadataReceiver {
    stream: SelectAll<BoxStream<'static, OntologyTypeMetadataRowBatch>>,
}

impl Stream for OntologyTypeMetadataReceiver {
    type Item = OntologyTypeMetadataRowBatch;

    fn poll_next(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        self.stream.poll_next_unpin(cx)
    }
}

pub fn ontology_metadata_channel(
    chunk_size: usize,
    account_sender: AccountSender,
) -> (OntologyTypeMetadataSender, OntologyTypeMetadataReceiver) {
    let (id_tx, id_rx) = mpsc::channel(chunk_size);
    let (owned_metadata_tx, owned_metadata_rx) = mpsc::channel(chunk_size);
    let (external_metadata_tx, external_metadata_rx) = mpsc::channel(chunk_size);

    (
        OntologyTypeMetadataSender {
            account: account_sender,
            id: id_tx,
            owned_metadata: owned_metadata_tx,
            external_metadata: external_metadata_tx,
        },
        OntologyTypeMetadataReceiver {
            stream: select_all([
                id_rx
                    .ready_chunks(chunk_size)
                    .map(OntologyTypeMetadataRowBatch::Ids)
                    .boxed(),
                owned_metadata_rx
                    .ready_chunks(chunk_size)
                    .map(OntologyTypeMetadataRowBatch::OwnedMetadata)
                    .boxed(),
                external_metadata_rx
                    .ready_chunks(chunk_size)
                    .map(OntologyTypeMetadataRowBatch::ExternalMetadata)
                    .boxed(),
            ]),
        },
    )
}
