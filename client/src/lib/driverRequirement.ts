type DriverAwareProduct = {
  driver220?: unknown | null;
  driverBivolt?: unknown | null;
};

/** Um produto só precisa selecionar tensão quando a API informou algum driver aplicável. */
export function requiresExternalDriver(product: DriverAwareProduct): boolean {
  return Boolean(product.driver220 || product.driverBivolt);
}
