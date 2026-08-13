export function getModularOptimizationStatus(options: {
  optimizeModuleCount: boolean;
  allowLongModules: boolean;
  allowFractional: boolean;
  allowMixedIF: boolean;
}) {
  const labels = [
    options.optimizeModuleCount ? "Otimizar quantidade de módulos" : "Otimizar pelo comprimento mais próximo",
    options.allowLongModules ? "módulos longos permitidos" : "até 5 barras",
  ];
  if (options.allowFractional) labels.push("medidas quebradas");
  if (options.allowMixedIF) labels.push("IFs diferentes");
  return labels;
}
