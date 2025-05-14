import { useParams } from "react-router-dom";
import { useFormResponse } from "../../hooks/useFormResponse";
import { Typography, Util } from "tabler-react-2";
import { FormConsumer } from "../formConsumer/FormConsumer";

export const FormResponseRUD = ({ id }) => {
  const { eventId, campaignId } = useParams();
  const {
    response,
    fields,
    flat,
    loading,
    error,
    updateResponse,
    deleteResponse,
  } = useFormResponse(eventId, campaignId, id);

  const [fieldsThatExist, fieldsThatDontExist] = fields.reduce(
    ([inForm, notInForm], f) =>
      f.currentlyInForm
        ? [[...inForm, f], notInForm]
        : [inForm, [...notInForm, f]],
    [[], []]
  );

  const orderedFieldsThatExist = fieldsThatExist.sort(
    (a, b) => a.order - b.order
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!response) return <div>Response not found</div>;

  // Prepare initial form values and active fields
  const initialValues = {};
  orderedFieldsThatExist.forEach((f) => {
    if (f.type === "dropdown" && response[f.id]) {
      initialValues[f.id] = response[f.id].id;
    } else {
      initialValues[f.id] = response[f.id] ?? "";
    }
  });
  const formFields = orderedFieldsThatExist.map((f) => ({
    ...f,
    options: f.options.filter((o) => !o.deleted),
  }));

  return (
    <div>
      <Typography.H5 className={"mb-0 text-secondary"}>VOLUNTEER</Typography.H5>
      <Typography.H1>{response.flat.name}</Typography.H1>
      <Util.Hr text="Form Responses" />
      {/* Replace fields and raw JSON with FormConsumer */}
      <FormConsumer
        fields={formFields}
        initialValues={initialValues}
        onSubmit={async (values) => {
          await updateResponse(values);
        }}
      />
    </div>
  );
};
