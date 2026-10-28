import { AppDataSource } from '../config/typeorm.config';
import { RegistryEntity, RegistryReview } from '../modules/registry/registry.entity';
import { planDemoReviews } from '../modules/registry/demo-reviews';

async function main() {
  const argument = process.argv.find((v) => v.startsWith('--per-scenario='));
  const perScenario = argument ? Number(argument.split('=')[1]) : 10;
  await AppDataSource.initialize();
  try {
    await AppDataSource.transaction(async (manager) => {
      await manager.query("SELECT id FROM registry_dataset WHERE id = 'current' FOR UPDATE");
      const entities = await manager.find(RegistryEntity);
      const reviews = await manager.find(RegistryReview);
      const planned = planDemoReviews(entities.map((e) => e.record), reviews, Date.now(), perScenario);
      if (process.argv.includes('--apply')) {
        // Inserts only: existing assessments and public evidence are never replaced.
        for (const row of planned) await manager.insert(RegistryReview, row);
      }
      console.log(JSON.stringify({ applied: process.argv.includes('--apply'), existing: reviews.length,
        planned: planned.map((r) => ({ lei: r.lei, scenario: r.state.demo!.scenario, dueDate: r.state.dueDate })) }));
    });
  } finally { await AppDataSource.destroy(); }
}
main().catch((e: unknown) => { console.error(e instanceof Error ? e.message : 'Demo initialization failed'); process.exitCode = 1; });
