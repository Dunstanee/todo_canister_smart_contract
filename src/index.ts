// cannister code goes here
import {
  $query,
  $update,
  Record,
  StableBTreeMap,
  Vec,
  match,
  Result,
  nat64,
  ic,
  Opt,
} from "azle";
import { v4 as uuidv4 } from "uuid";

/**
 * This type represents a message that can be listed on a board.
 */

type Message = Record<{
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
}>;

/**
 * create a payload to load data in the canister
 * */
type MessagePayload = Record<{
  title: string;
  description: string;
}>;

/**
 * we need a place to store these messages
 * */

const todoStorage = new StableBTreeMap<string, Message>(0, 44, 1024);

/**
 * Retrieves all messages stored within our canister
 * */
$query;
export function getMessages(): Result<Vec<Message>, string> {
  try {
    return Result.Ok(todoStorage.values());
  } catch (error) {
    return Result.Err(`Failed to fetch messages: ${error}`);
  }
}

/**
 * Retrieves a specific message stored within our canister by the unique identifier
 * */

$query;
export function getMessage(id: string): Result<Message, string> {
  if (!id) {
    return Result.Err<Message, string>("Invalid id");
  }
  try {
    return match(todoStorage.get(id), {
      Some: (message) => Result.Ok<Message, string>(message),
      None: () => Result.Err<Message, string>(`a task with id=${id} not found`),
    });
  } catch (error) {
    return Result.Err<Message, string>(`An error occurred: ${error}`);
  }
}
/**
 * create a function to add new messages
 */
$update
export function addMessage(payload: MessagePayload): Result<Message, string> {
  // Validate the payload before using it to create a new Message
  if (!payload.title || !payload.description) {
    return Result.Err("Invalid payload");
  }

  // Create a new Message with the validated payload
  const message: Message = {
    id: uuidv4(),
    createdAt: ic.time(),
    updatedAt: Opt.None,
    completed: false,
    title: payload.title,
    description: payload.description,
  };

  try {
    // Insert the new Message into the todoStorage
    todoStorage.insert(message.id, message);
  } catch (error) {
    // Handle the error here, e.g. log the error or provide fallback behavior
    console.error("Failed to insert message:", error);
    return Result.Err("Failed to add message");
  }

  // Return the new Message
  return Result.Ok(message);
}

/**
 * create a function to update a messages
 * */
$update;
export function updateMessage(
  id: string,
  payload: MessagePayload
): Result<Message, string> {
  // Validate the payload before using it to create a new Message
  if (!payload.title || !payload.description) {
    return Result.Err("Invalid payload");
  }

  if (!id) {
    return Result.Err<Message, string>("Invalid ID!");
  }
  if (typeof id !== "string") {
    return Result.Err<Message, string>("id must be a string");
  }

  return match(todoStorage.get(id), {
    Some: (message) => {
      const updatedMessage: Message = {
        ...message,
        title: payload.title,
        description: payload.description,
        updatedAt: Opt.Some(ic.time()),
      };
      todoStorage.insert(message.id, updatedMessage);
      return Result.Ok<Message, string>(updatedMessage);
    },
    None: () =>
      Result.Err<Message, string>(
        `couldn't update a task with id=${id}. task not found`
      ),
  });
}

/**
 * create a function to delete a messages
 * */
$update;
export function deleteMessage(id: string): Result<Message, string> {
  if (!id) {
    return Result.Err<Message, string>(`Invalid id: ${id}`);
  }
  
  return match(todoStorage.remove(id), {
    Some: (deletedMessage) => Result.Ok<Message, string>(deletedMessage),
    None: () =>
      Result.Err<Message, string>(
        `Task not found with id=${id}`
      ),
  });
}

// a workaround to make uuid package work with Azle
globalThis.crypto = {
  // @ts-ignore
  getRandomValues: () => {
    let array = new Uint8Array(32);

    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }

    return array;
  },
};
