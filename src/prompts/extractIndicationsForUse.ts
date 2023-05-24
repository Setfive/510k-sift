export const ExtractIndicationsForUse = (statement: string) => {
  return `This is a FDA 510(k) regulatory filing. 

Extract the "Indications For Use" text, if you can't find one reply with "None" and only "None"

${statement}
`;
};
