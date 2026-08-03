import { PAYWALL_COOLDOWN_MS } from '../../constants/free-pro-access';
import { STORAGE_KEYS } from '../../constants/storage-keys';
import { IStorageService } from '../contracts';

export class PaywallImpressionService {
  constructor(private readonly storage: IStorageService) {}

  private key(userId: string) {
    return `${STORAGE_KEYS.paywallImpressions}:${userId}`;
  }

  async canShowPaywall(userId: string, force = false): Promise<boolean> {
    if (force) return true;
    const last = await this.storage.getItem<number>(this.key(userId));
    if (!last) return true;
    return Date.now() - last >= PAYWALL_COOLDOWN_MS;
  }

  async recordImpression(userId: string): Promise<void> {
    await this.storage.setItem(this.key(userId), Date.now());
  }
}
