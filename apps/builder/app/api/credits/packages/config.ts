export type CreditPackage={id:string;name:string;credits:number;priceInr:number;description:string};

const DEFAULT_PACKAGES:CreditPackage[]=[
 {id:"starter",name:"Starter",credits:120,priceInr:199,description:"Good for a few website generations or image requests."},
 {id:"builder",name:"Builder",credits:350,priceInr:499,description:"Best for active website creation and iterative design."},
 {id:"studio",name:"Studio",credits:900,priceInr:999,description:"Higher-volume credits for agencies and frequent generation."}
];

export function creditPackages():CreditPackage[]{return DEFAULT_PACKAGES.map(pkg=>({...pkg,credits:envInt(`MICIRQL_PACKAGE_${pkg.id.toUpperCase()}_CREDITS`,pkg.credits),priceInr:envInt(`MICIRQL_PACKAGE_${pkg.id.toUpperCase()}_PRICE_INR`,pkg.priceInr)}));}
export function creditPackageById(id:string){return creditPackages().find(pkg=>pkg.id===id)??null;}
function envInt(name:string,fallback:number){const value=Number(process.env[name]??fallback);if(!Number.isInteger(value)||value<=0)throw new Error(`${name} must be a positive integer.`);return value;}
