type DriverAwareProduct = {
  driver220?: unknown | null;
  driverBivolt?: unknown | null;
  driverDim110v?: unknown | null;
  driverDimDali?: unknown | null;
};

/** Um produto só precisa selecionar tensão quando a API informou algum driver aplicável. */
export function requiresExternalDriver(product: DriverAwareProduct): boolean {
  return Boolean(product.driver220 || product.driverBivolt || product.driverDim110v || product.driverDimDali);
}
