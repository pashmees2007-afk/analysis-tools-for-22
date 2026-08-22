import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as ort from "onnxruntime-node";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modelPath = path.join(projectRoot, "server", "models", "mobilenetv3_unet_v1.onnx");
const session = await ort.InferenceSession.create(modelPath, { executionProviders: ["cpu"] });
const input = new ort.Tensor("float32", new Float32Array(3 * 256 * 256), [1, 3, 256, 256]);
const output = await session.run({ image: input });
const logits = output.logits;

assert.deepEqual(session.inputNames, ["image"]);
assert.deepEqual(session.outputNames, ["logits"]);
assert.deepEqual(logits.dims, [1, 4, 256, 256]);
assert.equal(logits.data.length, 4 * 256 * 256);
console.log(JSON.stringify({ modelPath, inputNames: session.inputNames, outputNames: session.outputNames, logits: logits.dims }));
