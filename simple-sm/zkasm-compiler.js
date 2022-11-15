const path = require("path")
const fs = require("fs")
const zkasm_parser = require("./zkasm-parser").parser
const stringifyBigInts = require("ffjavascript").utils.stringifyBigInts;


module.exports = async function compile(fileName) {

    let ctx = {
        definedLabels: {},
        out: [],
        srcLines: [],
    }

    const fullFileName = path.resolve(process.cwd(), fileName);
    const fileDir = path.dirname(fullFileName);

    const src = await fs.promises.readFile(fullFileName, "utf8") + "\n";

    // Compile the zkasm program into json
    const lines = zkasm_parser.parse(src);

    // Add more info for debugging purposes
    relativeFileName = path.basename(fullFileName);
    ctx.basePath = fileDir;
    ctx.srcLines[relativeFileName] = src.split(/(?:\r\n|\n|\r)/);

    for (let i=0; i<lines.length; i++) {
        const l = lines[i];
        ctx.currentLine = l;
        l.fileName = relativeFileName;
        if (l.type == "step") {
            const traceStep = {};
            try {

                if (l.assignment) {
                    appendOp(traceStep, processAssignmentIn(ctx, l.assignment.in, ctx.out.length));
                    appendOp(traceStep, processAssignmentOut(ctx, l.assignment.out));
                }

                for (let j=0; j< l.ops.length; j++) {
                    appendOp(traceStep, l.ops[j])
                }


            } catch (err) {
                error(l, err);
            }
            traceStep.line = l;
            ctx.out.push(traceStep);

        } else if (l.type == "label") {
            const id = l.identifier
            if (ctx.definedLabels[id]) error(l, `RedefinedLabel: ${id}` );
            ctx.definedLabels[id] = ctx.out.length;
            lastLineAllowsCommand = false;
        } else {
            error(l, `Invalid line type: ${l.type}`);
        }
    }

    for (let i=0; i<ctx.out.length; i++) {
        if (
                (typeof ctx.out[i].offset !== "undefined") &&
                (isNaN(ctx.out[i].offset))
            ) {
            if (ctx.out[i].JMPZ || ctx.out[i].JMP) {
                if (typeof ctx.definedLabels[ctx.out[i].offset] === "undefined") {
                    error(ctx.out[i].line, `Label: ${ctx.out[i].offset} not defined.`);
                }
                ctx.out[i].offsetLabel = ctx.out[i].offset;
                ctx.out[i].offset = ctx.definedLabels[ctx.out[i].offset];
            } 
        }

        resolveDataOffset(i, ctx.out[i]);
        ctx.out[i].fileName = ctx.out[i].line.fileName;
        ctx.out[i].line = ctx.out[i].line.line;
        ctx.out[i].lineStr = ctx.srcLines[ctx.out[i].fileName][ctx.out[i].line - 1] ?? '';
    }

    const res = {
        program:  stringifyBigInts(ctx.out),
        labels: ctx.definedLabels
    }

    return res;
}

function processAssignmentIn(ctx, input, currentLine) {
    const res = {};
    let E1;

    if (input.type == "TAG") {
        res.freeIn = input.tag ? {
            op: "functionCall", 
            funcName: input.tag.replace(/[\])}[{(]/g, '').trim(),  
        } : { op: "" };
        res.inFREE = 1n;
        return res;
    }

    if (input.type == "REG") {
        if (input.reg == "zkPC") {
            res.CONST = BigInt(currentLine);
        }
        else {
            res["in"+ input.reg] = 1n;
        }
        return res;
    }

    if (input.type == "CONST") {
        res.CONST = BigInt(input.const);
        return res;
    }

    if (input.type == "CONSTL") {
        res.CONSTL = BigInt(input.const);
        return res;
    }

    if (input.type == "neg") {
        E1 = processAssignmentIn(ctx, input.values[0], currentLine);
    }

    if (input.type == "neg") {
        Object.keys(E1).forEach(function(key) {
            E1[key] = -E1[key];
        });
        return E1;
    }

    throw new Error( `Invalid type: ${input.type}` );
}

function processAssignmentOut(ctx, outputs) {
    const res = {};
    for (let i=0; i<outputs.length; i++) {
        if (typeof res["set"+ outputs[i]] !== "undefined") throw new Error(`Register ${outputs[i]} added twice in assignment output`);
        res["set"+ outputs[i]] = 1;
    }
    return res;
}

function resolveDataOffset(i, cmd) {
    if (typeof cmd !== 'object' || cmd === null) return;
    const keys = Object.keys(cmd);
    for (let ikey = 0; ikey < keys.length; ++ikey) {
        const name = keys[ikey];
        if (Array.isArray(cmd[name])) {
            for (let j = 0; j < cmd[name].length; ++j) {
                resolveDataOffset(i, cmd[name][j]);
            }
        }
        else if (typeof cmd[name] == 'object') {
            resolveDataOffset(i, cmd[name]);
        }
    }
}

function appendOp(step, op) {
    Object.keys(op).forEach(function(key) {
        step[key] = op[key];
    });
}

function error(l, err) {
    if (err instanceof Error) {
        err.message = `ERROR ${l.fileName}:${l.line}: ${err.message}`
        throw(err);
    } else {
        const msg = `ERROR ${l.fileName}:${l.line}: ${err}`;
        throw new Error(msg);
    }
}
