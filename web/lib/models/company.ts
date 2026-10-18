import { Schema, model, models, type Model } from "mongoose";

// One company per wallet. The name is SELF-DECLARED, not verified.
export interface CompanyFields {
  address: string; // checksummed wallet address
  name: string;
}

const companySchema = new Schema<CompanyFields>(
  {
    address: { type: String, required: true, unique: true },
    name: { type: String, required: true },
  },
  { timestamps: true },
);

export const CompanyModel: Model<CompanyFields> =
  (models.Company as Model<CompanyFields>) || model<CompanyFields>("Company", companySchema);

export function toCompany(d: CompanyFields) {
  return { address: d.address, name: d.name };
}