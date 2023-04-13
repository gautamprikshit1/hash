use core::cmp::{Ordering, Reverse};

use error_stack::{Report, Result, ResultExt};

use crate::{
    error::{
        DeserializeError, ExpectedVariant, ReceivedVariant, UnknownVariantError, Variant,
        VisitorError,
    },
    Deserialize, Deserializer, Document, Reflection, Schema, Visitor,
};

impl<'de, T: Deserialize<'de>> Deserialize<'de> for Reverse<T> {
    type Reflection = T::Reflection;

    fn deserialize<D: Deserializer<'de>>(de: D) -> Result<Self, DeserializeError> {
        T::deserialize(de).map(Reverse)
    }
}

struct OrderingVisitor;

impl<'de> Visitor<'de> for OrderingVisitor {
    type Value = Ordering;

    fn expecting(&self) -> Document {
        Ordering::reflection()
    }

    fn visit_str(self, v: &str) -> Result<Self::Value, VisitorError> {
        match v {
            "Less" => Ok(Ordering::Less),
            "Equal" => Ok(Ordering::Equal),
            "Greater" => Ok(Ordering::Greater),
            _ => Err(Report::new(UnknownVariantError.into_error())
                .attach(ReceivedVariant::new(v))
                .attach(ExpectedVariant::new("Less"))
                .attach(ExpectedVariant::new("Equal"))
                .attach(ExpectedVariant::new("Greater"))
                .change_context(VisitorError)),
        }
    }

    fn visit_bytes(self, v: &[u8]) -> Result<Self::Value, VisitorError> {
        match v {
            b"Less" => Ok(Ordering::Less),
            b"Equal" => Ok(Ordering::Equal),
            b"Greater" => Ok(Ordering::Greater),
            _ => {
                let mut error = Report::new(UnknownVariantError.into_error())
                    .attach(ExpectedVariant::new("Less"))
                    .attach(ExpectedVariant::new("Equal"))
                    .attach(ExpectedVariant::new("Greater"));

                if let Ok(received) = core::str::from_utf8(v) {
                    error = error.attach(ReceivedVariant::new(received));
                }

                Err(error.change_context(VisitorError))
            }
        }
    }
}

impl Reflection for Ordering {
    fn schema(_: &mut Document) -> Schema {
        Schema::new("string").with("oneOf", ["Less", "Equal", "Greater"])
    }
}

// we can directly call `deserialize_str` because we only have identifier with no data
impl<'de> Deserialize<'de> for Ordering {
    type Reflection = Self;

    fn deserialize<D: Deserializer<'de>>(de: D) -> Result<Self, DeserializeError> {
        de.deserialize_str(OrderingVisitor)
            .change_context(DeserializeError)
    }
}
