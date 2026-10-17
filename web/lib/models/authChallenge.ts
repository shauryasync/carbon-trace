import { Schema, model, models, type Model } from "mongoose";

// A pending login: the exact message the wallet must sign. One per address.
export interface AuthChallengeFields {
  address: string;
  nonce: string;
  message: string;
  expiresAt: Date;
}

const schema = new Schema<AuthChallengeFields>({
  address: { type: String, required: true, unique: true },
  nonce: { type: String, required: true },
  message: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

// MongoDB deletes expired challenges automatically (it checks about once a minute).
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthChallengeModel: Model<AuthChallengeFields> =
  (models.AuthChallenge as Model<AuthChallengeFields>) ||
  model<AuthChallengeFields>("AuthChallenge", schema);