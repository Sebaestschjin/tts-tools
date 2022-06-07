import { expect } from "chai";
import { readFileSync } from "fs";
import { bundle } from "../src/xmlbundle";

const includeDir = `${__dirname}/include`;
const resolvedDir = `${__dirname}/resolved`;

describe("XMLBundle", function () {
  describe("bundle", function () {
    it("should return the same value without an Include", () => {
      const input = "<Panel />\n";

      const result = bundle(input, includeDir);

      expect(result).to.be.equal(input);
    });

    it("should resolve a single Include", () => {
      const input = '<Include src="main" />';
      const expected = borderedFile("main", "main");

      const result = bundle(input, includeDir);

      expect(result).to.be.equal(expected);
    });

    it("should resolve Includes with a file extension", () => {
      const input = '<Include src="main.xml" />';
      const expected = borderedFile("main.xml", "main");

      const result = bundle(input, includeDir);

      expect(result).to.be.equal(expected);
    });

    it("should resolve Includes case-insensitive", () => {
      const input = '<include Src="MaIn.XmL" />';
      const expected = borderedFile("MaIn.XmL", "main");

      const result = bundle(input, includeDir);

      expect(result).to.be.equal(expected);
    });

    it("should resolve a single Include with extra spaces", () => {
      const input = '<Include src="main"  />\n';
      const expected = borderedFile("main", "main") + "\n";

      const result = bundle(input, includeDir);

      expect(result).to.be.equal(expected);
    });

    it("should resolve multiple Includes", () => {
      const input = '<Include src="main" />\n<Include src="main" />';
      const oneLine = borderedFile("main", "main");
      const expected = `${oneLine}\n${oneLine}`;

      const result = bundle(input, includeDir);

      expect(result).to.be.equal(expected);
    });

    it("should resolve transitive Includes in the same directory", () => {
      const input = '<Include src="withInclude" />';
      const sub = borderedFile("main", "main");
      const expected = bordered("withInclude", `${sub}\n`);

      const result = bundle(input, includeDir);

      expect(result).to.be.equal(expected);
    });

    it("should resolve transitive Includes in nested directories", () => {
      const input = readInclude("withSub");
      const sub = borderedFile("sub", "sub/sub");
      const expected = bordered("sub/index", `${sub}\n`) + "\n";

      const result = bundle(input, includeDir);

      expect(result).to.be.equal(expected);
    });

    it("should keep indentation", () => {
      const input = readInclude("withIndent");
      const expected = readResolved("withIndent");

      const result = bundle(input, includeDir);

      expect(result).to.be.equal(expected);
    });
  });
});

const readInclude = (name: string) => {
  return readFileSync(`${includeDir}/${name}.xml`, { encoding: "utf-8" });
};

const readResolved = (name: string) => {
  return readFileSync(`${resolvedDir}/${name}.xml`, { encoding: "utf-8" });
};

const bordered = (name: string, content: string) => {
  const border = `<!-- include ${name} -->`;
  return `${border}\n${content}\n${border}`;
};

const borderedFile = (border: string, file: string) => {
  const fileContent = readInclude(file);
  return bordered(border, fileContent);
};
