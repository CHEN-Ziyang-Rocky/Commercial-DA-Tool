import {
  Column,
  Entity,
  Index,
  PrimaryColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import type { RegistryRecord, SnapshotMeta } from './registry.types';

@Entity('registry_entities')
export class RegistryEntity {
  @PrimaryColumn({ length: 20 }) lei: string;
  @Column({ length: 512 }) legalName: string;
  @Index() @Column({ length: 2 }) country: string;
  @Column({ length: 255 }) city: string;
  @Index() @Column({ length: 40 }) registrationStatus: string;
  @Index() @Column({ length: 40, default: 'ACTIVE' }) entityStatus: string;
  @Index()
  @Column({ type: 'datetime', precision: 3, nullable: true })
  nextRenewal: Date | null;
  @Column({ type: 'varchar', length: 20, nullable: true })
  sourceDirectParentLei: string | null;
  @Index()
  @Column({ type: 'varchar', length: 20, nullable: true })
  directParentLei: string | null;
  @ManyToOne(() => RegistryEntity, (e) => e.directChildren, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'directParentLei' })
  directParent: RegistryEntity | null;
  @OneToMany(() => RegistryEntity, (e) => e.directParent)
  directChildren: RegistryEntity[];
  @Column({ type: 'json' }) record: RegistryRecord;
}
@Entity('registry_dataset')
export class RegistryDataset {
  @PrimaryColumn({ length: 20 }) id: string;
  @Column({ length: 36, default: 'initial' }) version: string;
  @Column({ type: 'json' }) metadata: SnapshotMeta;
}

import type { ReviewState } from './governance';
@Entity('registry_reviews')
export class RegistryReview {
  @PrimaryColumn({ length: 20 }) lei: string;
  @Column({ type: 'json' }) state: ReviewState;
}
