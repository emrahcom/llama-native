/**
 * Calculates the cosine similarity between two vectors.
 * Returns a value between -1 and 1, where 1 indicates identical direction.
 */
export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  let dotProduct = 0;
  let sumSqA = 0;
  let sumSqB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    sumSqA += vectorA[i] * vectorA[i];
    sumSqB += vectorB[i] * vectorB[i];
  }

  const magnitudeA = Math.sqrt(sumSqA);
  const magnitudeB = Math.sqrt(sumSqB);

  return dotProduct / (magnitudeA * magnitudeB);
}
