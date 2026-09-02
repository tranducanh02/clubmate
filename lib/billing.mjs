export function roundUpToThousand(amount) {
  return Math.ceil(amount / 1000) * 1000;
}

export function calculateSessionShares({ courtCost, shuttleCost, maleCount, femaleCount, maleFactor }) {
  if (courtCost < 0 || shuttleCost < 0 || ![1, 1.5, 2].includes(maleFactor)) {
    throw new Error("Invalid billing input");
  }
  const total = maleCount + femaleCount;
  if (total < 1) throw new Error("At least one attendee is required");
  const weight = maleCount * maleFactor + femaleCount;
  const courtShare = courtCost / total;
  return {
    male: roundUpToThousand(courtShare + shuttleCost * maleFactor / weight),
    female: roundUpToThousand(courtShare + shuttleCost / weight),
  };
}
