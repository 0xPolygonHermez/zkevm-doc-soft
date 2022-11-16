const { FGL, starkSetup, starkGen, starkVerify } = require("pil-stark");
const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");
const path = require("path");

// Files
const pilFile = path.join(__dirname, "mfibonacci.pil");
const input = require("./mfibonacci.input.json");
const mFibExecutor = require("./executor_mfibonacci");
const starkStruct = require("./mfibonacci.starkstruct.json");

async function generateAndVerifyPilStark() {
    // Generate constants and trace
    const pil = await compile(FGL, pilFile);
    const constPols =  newConstantPolsArray(pil);
    const cmPols = newCommitPolsArray(pil);
    await mFibExecutor.buildConstants(constPols.mFibonacci);
    const executionResult = await mFibExecutor.execute(cmPols.mFibonacci, input);
    console.log(executionResult);
    // Verify if all the values of the execution trace match the PIL:
    const evaluationPilResult = await verifyPil(FGL, pil, cmPols , constPols); 
    if (evaluationPilResult.length != 0) { 
        console.log("Abort: the execution trace generated does not satisfy the PIL description!");
        for (let i=0; i < evaluationPilResult.length; i++) { console.log(pilVerificationResult[i]); }
        return;
    } else { console.log("Continue: execution trace matches the PIL!"); }

   // Setup for the stark
   const setup = await starkSetup(constPols, pil, starkStruct);
  
   // Generate the stark
   const proverResult =await starkGen(cmPols,constPols,setup.constTree,setup.starkInfo);
  
   // Verify the stark
   const verifierResult=await starkVerify(proverResult.proof,proverResult.publics,setup.constRoot,setup.starkInfo);
  
   if (verifierResult === true) { console.log("VALID proof!");
   } else { console.log("INVALID proof!"); }
}

generateAndVerifyPilStark();