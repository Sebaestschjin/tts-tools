export enum ObjectType {
  bag = "bag",
  block = "block",
  board = "board",
  card = "card",
  die = "die",
  deck = "deck",
  figure = "figure",
  other = "other",
  tile = "tile",
  token = "token",
}

export const getObjectType = (data: ObjectData): ObjectType => {
  if (data.Name === "Custom_Model") {
    const modelType = (data as ModelData).CustomMesh.TypeIndex ?? ModelType.Generic;
    return getObjectTypeForName(mapModelType(modelType));
  }

  return getObjectTypeForName(data.Name);
};

const getObjectTypeForName = (name: string): ObjectType => {
  if (name.includes("Bag")) {
    return ObjectType.bag;
  }

  if (name.startsWith("Deck")) {
    return ObjectType.deck;
  }

  if (name.startsWith("Card")) {
    return ObjectType.card;
  }

  if (name.includes("Tile")) {
    return ObjectType.tile;
  }

  if (name.includes("Token")) {
    return ObjectType.token;
  }

  if (name.startsWith("Die") || name.includes("Dice")) {
    return ObjectType.die;
  }

  if (name.includes("Board")) {
    return ObjectType.board;
  }

  if (name.includes("Block")) {
    return ObjectType.block;
  }

  return ObjectType.other;
};

const mapModelType = (modelType: ModelType): string => {
  switch (modelType) {
    case ModelType.Bag:
    case ModelType.Infinite:
      return "Bag";
    case ModelType.Dice:
      return "Die";
    case ModelType.Figurine:
      return "Figurine";
    case ModelType.Board:
      return "Board";
    default:
      return "Generic";
  }
};
