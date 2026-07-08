import { STORAGE_KEYS } from '../../constants/storage-keys';
import { CreateTrustedContactInput, createId, nowIso, TrustedContact } from '../../types';
import { IStorageService, ITrustedContactRepository } from '../contracts';

export class LocalTrustedContactRepository implements ITrustedContactRepository {
  constructor(private readonly storage: IStorageService) {}

  private async readAll(): Promise<TrustedContact[]> {
    return (await this.storage.getItem<TrustedContact[]>(STORAGE_KEYS.trustedContacts)) ?? [];
  }

  private async writeAll(contacts: TrustedContact[]): Promise<void> {
    await this.storage.setItem(STORAGE_KEYS.trustedContacts, contacts);
  }

  async listContacts(userId: string): Promise<TrustedContact[]> {
    const contacts = await this.readAll();
    return contacts.filter((item) => item.userId === userId);
  }

  async createContact(input: CreateTrustedContactInput): Promise<TrustedContact> {
    const timestamp = nowIso();
    const contact: TrustedContact = {
      id: createId('contact'),
      userId: input.userId,
      name: input.name,
      relation: input.relation,
      status: input.status ?? 'Available',
      phone: input.phone,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const contacts = await this.readAll();
    contacts.push(contact);
    await this.writeAll(contacts);
    return contact;
  }
}
