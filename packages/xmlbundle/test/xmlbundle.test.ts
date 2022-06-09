import { expect } from "chai";
import { readFileSync } from "fs";
import { bundle, unbundle } from "../src/xmlbundle";

const includeDir = `${__dirname}/include`;
const resolvedDir = `${__dirname}/resolved`;

describe("bundle", () => {
  context("when no Include is given", () => {
    it("should return the same value", () => {
      const input = "<Panel />\n";

      const result = bundle(input, includeDir);

      expect(result).to.be.equal(input);
    });
  });

  context("when a single Include is given ", () => {
    it("should resolve the Include", () => {
      const input = '<Include src="main" />';
      const expected = borderedFile("main", "main");

      const result = bundle(input, includeDir);

      expect(result).to.be.equal(expected);
    });
  });

  context("when using an Include", () => {
    [
      ["with Extension", '<Include src="main.xml" />', "main.xml"],
      ["with different case", '<include Src="MaIn.XmL" />', "MaIn.XmL"],
      ["with single quotes", "<Include src='main' />", "main"],
      ["without space", '<Include src="main"/>', "main"],
    ].forEach(([name, input, border]) => {
      it(name, () => {
        const expected = borderedFile(border, "main");

        const result = bundle(input, includeDir);

        expect(result).to.be.equal(expected);
      });
    });
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
    const input = '<Include src="not_existent" />';

    expect(() => bundle(input, includeDir)).to.throw("ENOENT: no such file or directory");
  });

  it("should throw an error with cyclic references", () => {
    const input = '<Include src="cycle1" />';

    expect(() => bundle(input, includeDir)).to.throw("Cycle detected");
  });
});

describe("unbundle", () => {
  it("should return the same value without an Include", () => {
    const input = "<Panel />";

    const result = unbundle(input);

    expect(result).to.be.equal(input);
  });
  it("should unbundle a single Include", () => {
    const input = readResolved("withInclude");
    const expected = readInclude("withInclude");

    const result = unbundle(input);

    expect(result).to.be.equal(expected);
  });
  it("should keep the name of the Include", () => {
    const input = "<!-- include MaIN.XmL -->\n<!-- include MaIN.XmL -->";
    const expected = '<Include src="MaIN.XmL" />';

    const result = unbundle(input);

    expect(result).to.be.equal(expected);
  });
  it("should unbundle multiple Includes", () => {
    const input = readResolved("withMultiple");
    const expected = readInclude("withMultiple");

    const result = unbundle(input);

    expect(result).to.be.equal(expected);
  });
  it("should unbundle nested Includes", () => {
    const input = readResolved("withNested");
    const expected = readInclude("withNested");

    const result = unbundle(input);

    expect(result).to.be.equal(expected);
  });
  it("should keep indentation", () => {
    const input = readResolved("withIndent");
    const expected = readInclude("withIndent");

    const result = unbundle(input);

    expect(result).to.be.equal(expected);
  });
  it("should ignore unmatched borders", () => {
    const input = "<!-- include main -->";
    const expected = "<!-- include main -->";

    const result = unbundle(input);

    expect(result).to.be.equal(expected);
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
