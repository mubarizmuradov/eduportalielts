import { Injectable } from '@nestjs/common';
import { EduportalIdentityReader } from './eduportal-identity.reader';
import type { MembershipTree } from './identity.types';

const TTL_MS = 20_000;
const MAX_ENTRIES = 5_000;

/**
 * Short-lived cache of a user's EduPortal memberships. A role revoked in
 * EduPortal takes effect in EduPortal IELTS within TTL_MS.
 */
@Injectable()
export class MembershipService {
  private readonly cache = new Map<string, { at: number; tree: MembershipTree }>();

  constructor(private readonly reader: EduportalIdentityReader) {}

  async tree(userId: string): Promise<MembershipTree> {
    const hit = this.cache.get(userId);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.tree;
    const tree = await this.reader.getMembershipTree(userId);
    if (this.cache.size >= MAX_ENTRIES) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(userId, { at: Date.now(), tree });
    return tree;
  }
}
