import type { LocalProfile } from '../library/localRepository';
import { emptyProfile, type ProfileData } from '../library/types';

export interface CloudProfile {
  revision: number;
  profile: ProfileData;
}

export interface CloudProfiles {
  read(): Promise<CloudProfile | null>;
  save(expected: number, profile: ProfileData): Promise<number | null>;
}

export interface LocalSync {
  readRecord(): Promise<LocalProfile | null>;
  acknowledgeCloud(editVersion: number, revision: number): Promise<boolean>;
  acceptCloud(profile: ProfileData, revision: number, expectedEdit: number): Promise<boolean>;
}

export type SyncResult =
  | { status: 'up-to-date' | 'pending' }
  | { status: 'conflict'; cloud: CloudProfile | null };

export type ConflictChoice = { use: 'device' | 'cloud'; seen: CloudProfile | null };

export async function syncProfile(local: LocalSync, cloud: CloudProfiles, choice?: ConflictChoice): Promise<SyncResult> {
  const snapshot = await local.readRecord();

  if (choice?.use === 'cloud') {
    // Read again so a cloud update after the prompt is not lost. A new local edit
    // during this read prevents the replacement, even after the user confirms.
    const latest = await cloud.read();
    const applied = await local.acceptCloud(latest?.profile ?? emptyProfile(), latest?.revision ?? 0, snapshot?.editVersion ?? 0);
    return applied ? { status: 'up-to-date' } : { status: 'conflict', cloud: latest };
  }

  if (snapshot?.pendingSync) {
    const expected = choice?.use === 'device' ? (choice.seen?.revision ?? 0) : snapshot.cloudRevision;
    const revision = await cloud.save(expected, snapshot.profile);
    if (revision === null) return { status: 'conflict', cloud: await cloud.read() };
    const moreEdits = await local.acknowledgeCloud(snapshot.editVersion, revision);
    return { status: moreEdits ? 'pending' : 'up-to-date' };
  }

  const remote = await cloud.read();
  if (remote && remote.revision !== snapshot?.cloudRevision) {
    const applied = await local.acceptCloud(remote.profile, remote.revision, snapshot?.editVersion ?? 0);
    return { status: applied ? 'up-to-date' : 'pending' };
  }
  return { status: 'up-to-date' };
}
