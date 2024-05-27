import { describe, expect, it } from "vitest";

import { bundle } from "../src/xmlbundle";
import { bordered, borderedFile, includeDir, includeDirTwo, readInclude, readIncludeTwo, readResolved } from "./util";

describe("bundle", () => {
  describe("when no Include is given", () => {
    it("should return the same value", () => {
      const input = "<Panel />\n";

      const result = bundle(input, includeDir);

      expect(result).to.be.equal(input);
    });
  });

  describe("when a single Include is given ", () => {
    it("should resolve the Include", () => {
      const input = '<Include src="main" />';
      const expected = borderedFile("main", "main");

      const result = bundle(input, includeDir);

      expect(result).to.be.equal(expected);
    });
  });

  describe("when using an Include", () => {
    it.each([
      ["with Extension", '<Include src="main.xml" />', "main.xml"],
      ["with different case", '<include Src="MaIn.XmL" />', "MaIn.XmL"],
      ["with single quotes", "<Include src='main' />", "main"],
      ["without space", '<Include src="main"/>', "main"],
    ])("%s it resolves the include", (name, input, border) => {
      const expected = borderedFile(border, "main");

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
      const nested = borderedFile("main", "main");
      const expected = bordered("withInclude", `${nested}\n`);

      const result = bundle(input, includeDir);

      expect(result).to.be.equal(expected);
    });

    it("should resolve transitive Includes in nested directories", () => {
      const input = readInclude("withNested");
      const expected = readResolved("withNested");

      const result = bundle(input, includeDir);

      expect(result).to.be.equal(expected);
    });

    it("should keep indentation", () => {
      const input = readInclude("withIndent");
      const expected = readResolved("withIndent");

      const result = bundle(input, includeDir);

      expect(result).to.be.equal(expected);
    });

    it("should keep empty new lines in Includes", () => {
      const input = '<Include src="multiline" />\n';
      const expected = readResolved("multiline");

      const result = bundle(input, includeDir);

      expect(result).to.be.equal(expected);
    });

    it("should throw an error when Include can not be found", () => {
      const fileName = "not_existent";
      const input = `<Include src="${fileName}" />`;

      expect(() => bundle(input, includeDir)).to.throw(`Can not resolve file '${fileName}.xml'`);
    });

    it("should throw an error with cyclic references", () => {
      const input = '<Include src="cycle1" />';

      expect(() => bundle(input, includeDir)).to.throw("Cycle detected");
    });
  });

  describe("when using multiple include directories", () => {
    it("should resolve from the second one", () => {
      const input = '<Include src="other" />\n';
      const expected = readResolved("fromOtherDir");

      const result = bundle(input, [includeDir, includeDirTwo]);
      expect(result).to.be.equal(expected);
    });

    it("should prefer the first one", () => {
      const input = '<Include src="main" />\n';
      const expected = readResolved("withMultipleDirs");

      const result = bundle(input, [includeDirTwo, includeDir]);
      expect(result).to.be.equal(expected);
    });

    it("should resolve nested from the first resolved root", () => {
      const input = readIncludeTwo("withNested");
      const expected = readResolved("withNestedMultiple");

      const result = bundle(input, [includeDirTwo, includeDir]);
      expect(result).to.be.equal(expected);
    });
  });
});
