export interface MatcherResult {
  pass: boolean;
  message: () => string;
}

export const RES_PATH = `${__dirname}/../../res/test`;

export const extractedPath = (name: string) => `${RES_PATH}/extracted/${name}`;
export const savePath = (name: string) => `${RES_PATH}/saves/${name}.json`;
export const outputPath = (name: string) => `${RES_PATH}/temp/${name}`;
export const inlucdePath = `${RES_PATH}/script/first`;
export const inlucdePath2 = `${RES_PATH}/script/second`;
