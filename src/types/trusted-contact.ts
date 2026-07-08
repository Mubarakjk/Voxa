import { EntityId, Timestamps } from './common';

export type TrustedContact = Timestamps & {
  id: EntityId;
  userId: EntityId;
  name: string;
  relation: string;
  status: string;
  phone?: string;
  isEmergency?: boolean;
};

export type CreateTrustedContactInput = {
  userId: EntityId;
  name: string;
  relation: string;
  status?: string;
  phone?: string;
  isEmergency?: boolean;
};
