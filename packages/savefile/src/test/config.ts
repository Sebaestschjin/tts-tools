export interface MatcherResult {
  pass: boolean;
  message: () => string;
}

export const RES_PATH = `${__dirname}/../../res/test`;
export const OUTPUT_PATH = `${RES_PATH}/temp`;

export const extractedPath = (name: string) => `${RES_PATH}/extracted/${name}`;
export const savePath = (name: string) => `${RES_PATH}/saves/${name}.json`;
