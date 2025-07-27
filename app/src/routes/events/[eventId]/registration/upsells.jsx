import { EventPage } from "../../../../../components/eventPage/EventPage";
import { UpsellItemCRUDTrigger } from "../../../../../components/UpsellItemCRUD/UpsellItemCRUDTrigger";

export const UpsellsPage = () => {
  return (
    <EventPage title="Upsells" loading={false}>
      <UpsellItemCRUDTrigger>Add Upsell</UpsellItemCRUDTrigger>
    </EventPage>
  );
};
