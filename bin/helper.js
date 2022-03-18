"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeJSONFile = exports.copy = exports.copyDir = exports.emptyDir = exports.isEmpty = exports.isWriteable = void 0;
const fs_1 = __importDefault(require("fs"));
const json_stable_stringify_without_jsonify_1 = __importDefault(require("json-stable-stringify-without-jsonify"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
async function isWriteable(directory) {
    try {
        await fs_1.default.promises.access(directory, (fs_1.default.constants || fs_1.default).W_OK);
        return true;
    }
    catch (err) {
        return false;
    }
}
exports.isWriteable = isWriteable;
const isEmpty = (dir) => !fs_1.default.readdirSync(dir).length;
exports.isEmpty = isEmpty;
const emptyDir = (dir) => {
    if (fs_1.default.existsSync(dir)) {
        for (const file of fs_1.default.readdirSync(dir)) {
            const abs = path_1.default.resolve(dir, file);
            if (fs_1.default.statSync(abs).isDirectory()) {
                (0, exports.emptyDir)(abs);
                fs_1.default.rmdirSync(abs);
            }
            else {
                fs_1.default.unlinkSync(abs);
            }
        }
    }
};
exports.emptyDir = emptyDir;
const copyDir = (src, dest, options) => {
    var _a;
    if (!fs_1.default.existsSync(dest)) {
        fs_1.default.mkdirSync(dest, { recursive: true });
    }
    for (const file of fs_1.default.readdirSync(src)) {
        const srcFile = path_1.default.resolve(src, file);
        const destFile = path_1.default.resolve(dest, ((_a = options === null || options === void 0 ? void 0 : options.rename) === null || _a === void 0 ? void 0 : _a.call(options, file)) || file);
        if (fs_1.default.statSync(srcFile).isDirectory()) {
            (0, exports.copyDir)(srcFile, destFile, options);
        }
        else {
            fs_1.default.copyFileSync(srcFile, destFile);
        }
    }
};
exports.copyDir = copyDir;
const copy = (src, dest) => {
    if (fs_1.default.statSync(src).isDirectory()) {
        (0, exports.copyDir)(src, dest);
    }
    else {
        fs_1.default.copyFileSync(src, dest);
    }
};
exports.copy = copy;
const writeJSONFile = (config, filePath) => {
    fs_1.default.writeFileSync(filePath, (0, json_stable_stringify_without_jsonify_1.default)(config, {
        cmp: (a, b) => (a.key > b.key ? 1 : -1),
        space: 4,
    }) + os_1.default.EOL, 'utf8');
};
exports.writeJSONFile = writeJSONFile;
