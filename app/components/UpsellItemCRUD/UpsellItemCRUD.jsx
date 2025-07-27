import { Typography, Input, Checkbox } from "tabler-react-2";
import { ImageInput } from "../ImageInput/ImageInput";
import { useState } from "react";

export const UpsellItemCRUD = ({ upsellItemId }) => {
  const upsellItem = true
    ? {}
    : {
        id: upsellItemId,
        name: "Upsell Item",
        description: "Upsell Item Description",
        price: 100,
        inventory: 10,
      };

  const [item, setItem] = useState(upsellItem);

  return (
    <div>
      <Typography.H5 className="mb-0 text-secondary">UPSELL ITEM</Typography.H5>
      <Typography.H1>{upsellItem?.name || "New Upsell Item"}</Typography.H1>
      {/* <ImageInput /> */}
      <Input
        label="Name"
        value={item.name}
        onChange={(e) => setItem({ ...item, name: e })}
        required
        placeholder="Name your upsell item..."
      />
      <Input
        label="Description"
        value={item.description}
        onChange={(e) => setItem({ ...item, description: e })}
      />
      <Input
        label="Price"
        value={item.price}
        onChange={(e) => setItem({ ...item, price: parseInt(e, 10) })}
        prependedText="$"
        appendedText="USD"
        required
        type="number"
        min={0}
      />
      <label className="form-label">Inventory</label>
      <Checkbox
        label="Unlimited"
        value={item.inventory === -1}
        onChange={(e) => setItem({ ...item, inventory: e ? -1 : 0 })}
      />
      {item.inventory !== -1 && (
        <Input
          value={item.inventory}
          onChange={(e) => setItem({ ...item, inventory: parseInt(e, 10) })}
          type="number"
          min={0}
          appendedText="units"
        />
      )}
    </div>
  );
};
