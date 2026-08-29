/**
 * Live calls against the public NHTSA vPIC API.
 *
 *   npx tsx src/lib/nhtsa/examples.ts
 *
 * Needs network. No API key.
 */

import { VpicClient, VpicNhtsaError, VpicVinFormatError } from "@/lib/nhtsa";

const SAMPLE_VIN = "1HGCM82633A004352"; // 2003 Honda Accord
const SAMPLE_VIN_ACURA = "JH4KA7561PC008269";

async function main(): Promise<void> {
  const vpic = new VpicClient({ timeoutMs: 20_000 });

  console.log("1) Decode VIN (Extended)");
  const decoded = await vpic.decodeVinExtended(SAMPLE_VIN);
  console.log({
    vin: decoded.vin,
    make: decoded.make,
    model: decoded.model,
    modelYear: decoded.modelYear,
    bodyClass: decoded.bodyClass,
    engineCylinders: decoded.engineCylinders,
    displacementL: decoded.displacementL,
    errorCode: decoded.errorCode,
  });

  console.log("\n2) Batch Decode VIN");
  const batch = await vpic.decodeVinBatch([
    SAMPLE_VIN,
    { vin: SAMPLE_VIN_ACURA },
  ]);
  for (const row of batch) {
    console.log(`${row.vin} → ${row.make} ${row.model} ${row.modelYear}`);
  }

  console.log("\n3) Get Makes (vehicle type = car)");
  const makes = await vpic.getMakes("car");
  console.log(`makes: ${makes.length}; first 5:`, makes.slice(0, 5).map((m) => m.makeName));

  console.log("\n4) Get Models (Honda / 2015)");
  const models = await vpic.getModels("honda", 2015);
  console.log(
    `models: ${models.length}; sample:`,
    models.slice(0, 8).map((m) => m.modelName),
  );

  console.log("\n5) VIN format rejection");
  try {
    await vpic.decodeVinExtended("1HGCM8263IA004352"); // I is illegal
  } catch (error) {
    if (error instanceof VpicVinFormatError) {
      console.log("caught", error.name, "—", error.message);
    } else {
      throw error;
    }
  }

  console.log("\n6) NHTSA ErrorCode (requireClean=false keeps the row)");
  const dirty = await vpic.decodeVinExtended("1HGCM82633A000000", { requireClean: false });
  console.log({
    hasNhtsaError: dirty.hasNhtsaError,
    errorCode: dirty.errorCode,
    errorText: dirty.errorText,
    additionalErrorText: dirty.additionalErrorText,
  });
  try {
    await vpic.decodeVinExtended("1HGCM82633A000000");
  } catch (error) {
    if (error instanceof VpicNhtsaError) {
      console.log("caught", error.name, "—", error.message);
    } else {
      throw error;
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
