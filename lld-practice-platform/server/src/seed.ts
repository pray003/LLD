import { SqliteProblemRepository } from "./repositories/ProblemRepository.js";
import { seedProblems } from "./seedData.js";

const repo = new SqliteProblemRepository();
for (const problem of seedProblems) {
  repo.upsert(problem);
}
console.log(`Seeded ${seedProblems.length} problems.`);
