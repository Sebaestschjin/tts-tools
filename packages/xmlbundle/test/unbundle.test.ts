import { describe, expect, it } from "vitest";

import { unbundle } from "../src/xmlbundle";
import { readInclude, readResolved } from "./util";

describe("unbundle", () => {
  it("should return the same value without an Include", () => {
    const input = "<Panel />";

    const result = unbundleRoot(input);

    expect(result).to.be.equal(input);
  });

  it("should unbundle a single Include", () => {
    const input = readResolved("withInclude");
    const expected = readInclude("withInclude");

    const result = unbundleRoot(input);

    expect(result).to.be.equal(expected);
  });

  it("should keep the name of the Include", () => {
    const input = "<!-- include MaIN.XmL -->\n<!-- include MaIN.XmL -->";
    const expected = '<Include src="MaIN.XmL" />';

    const result = unbundleRoot(input);

    expect(result).to.be.equal(expected);
  });

  it("should unbundle multiple Includes", () => {
    const input = readResolved("withMultiple");
    const expected = readInclude("withMultiple");

    const result = unbundleRoot(input);

    expect(result).to.be.equal(expected);
  });

  it("should unbundle nested Includes", () => {
    const input = readResolved("withNested");
    const expected = readInclude("withNested");

    const result = unbundleRoot(input);

    expect(result).to.be.equal(expected);
  });

  it("should keep indentation", () => {
    const input = readResolved("withIndent");
    const expected = readInclude("withIndent");

    const result = unbundleRoot(input);

    expect(result).to.be.equal(expected);
  });

  it("should ignore unmatched borders", () => {
    const input = "<!-- include main -->";
    const expected = "<!-- include main -->";

    const result = unbundleRoot(input);

    expect(result).to.be.equal(expected);
  });

  it("should unbundle with carriage return and linefeed", () => {
    const input = "<!-- include some -->\r\n<!-- include some -->";
    const expected = '<Include src="some" />';

    const result = unbundleRoot(input);

    expect(result).to.be.equal(expected);
  });

  it("should unbundle all", () => {
    const input = readResolved("multiBundle");

    const result = unbundle(input);

    expect(result.bundles).toHaveProperty("main");
    expect(result.bundles).toHaveProperty("main/nested");
    expect(result.bundles).toHaveProperty("main/nested/more");
    expect(result.bundles).toHaveProperty("main/other/nested");
    expect(result.bundles).toHaveProperty("something");
  });
});

const unbundleRoot = (input: string) => {
  const result = unbundle(input);

  return result.root;
};
