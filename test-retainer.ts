import { generateRetainerInstances } from "./src/lib/retainer-logic";
generateRetainerInstances().then(() => console.log("Done")).catch((e: any) => console.log(e));
