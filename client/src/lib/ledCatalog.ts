// Catálogo completo de perfis LED lineares
// Gerado automaticamente a partir de MEDIDASPERFIL.xlsx
// Regra de Ouro: Apenas módulos com SKU válido existem no catálogo

export interface ModuleData {
  length: number;
  sku: string;
}

export interface ProfileModules {
  IN: Record<string, ModuleData>;
  IF: Record<string, ModuleData>;
  ML: Record<string, ModuleData>;
}

export interface ProfileData {
  name: string;
  code: string;
  installType: string;
  sheet?: string;
  modules: ProfileModules;
}

export type ModuleType = "IN" | "IF" | "ML";

export const LED_CATALOG: Record<string, ProfileData> = {
  "LLE-2580": {
    "name": "EASY PRIME",
    "code": "LLE-2580",
    "sheet": "EASY PRIME",
    "installType": "EMBUTIR",
    "modules": {
      "IN": {
        "1": {
          "length": 589,
          "sku": "LLE-2580.1IN.18F"
        },
        "1.4": {
          "length": 839,
          "sku": "LLE-2580.14I.18F"
        },
        "1.7": {
          "length": 1024,
          "sku": "LLE-2580.17I.18F"
        },
        "2": {
          "length": 1149,
          "sku": "LLE-2580.2IN.18F"
        },
        "2.1": {
          "length": 1214,
          "sku": "LLE-2580.21I.18F"
        },
        "2.2": {
          "length": 1274,
          "sku": "LLE-2580.22I.18F"
        },
        "2.4": {
          "length": 1399,
          "sku": "LLE-2580.24I.18F"
        },
        "2.5": {
          "length": 1464,
          "sku": "LLE-2580.25I.18F"
        },
        "2.8": {
          "length": 1649,
          "sku": "LLE-2580.28I.18F"
        },
        "3": {
          "length": 1714,
          "sku": "LLE-2580.3IN.18F"
        },
        "3.1": {
          "length": 1774,
          "sku": "LLE-2580.31I.18F"
        },
        "3.4": {
          "length": 1964,
          "sku": "LLE-2580.34I.18F"
        },
        "3.5": {
          "length": 2024,
          "sku": "LLE-2580.35I.18F"
        },
        "3.6": {
          "length": 2089,
          "sku": "LLE-2580.36I.18F"
        },
        "3.7": {
          "length": 2149,
          "sku": "LLE-2580.37I.18F"
        },
        "4": {
          "length": 2274,
          "sku": "LLE-2580.4IN.18F"
        },
        "4.2": {
          "length": 2399,
          "sku": "LLE-2580.42I.18F"
        },
        "4.3": {
          "length": 2464,
          "sku": "LLE-2580.43I.18F"
        },
        "4.4": {
          "length": 2524,
          "sku": "LLE-2580.44I.18F"
        },
        "4.5": {
          "length": 2589,
          "sku": "LLE-2580.45I.18F"
        },
        "4.7": {
          "length": 2714,
          "sku": "LLE-2580.47I.18F"
        },
        "4.8": {
          "length": 2774,
          "sku": "LLE-2580.48I.18F"
        },
        "5": {
          "length": 2839,
          "sku": "LLE-2580.5IN.18F"
        },
        "5.2": {
          "length": 2964,
          "sku": "LLE-2580.52I.18F"
        },
        "5.3": {
          "length": 3024,
          "sku": "LLE-2580.53I.18F"
        },
        "5.4": {
          "length": 3089,
          "sku": "LLE-2580.54I.18F"
        },
        "5.6": {
          "length": 3214,
          "sku": "LLE-2580.56I.18F"
        },
        "6": {
          "length": 3399,
          "sku": "LLE-2580.6IN.18F"
        }
      },
      "IF": {
        "1": {
          "length": 582,
          "sku": "LLE-2580.1IF.18F"
        },
        "2": {
          "length": 1142,
          "sku": "LLE-2580.2IF.18F"
        },
        "3": {
          "length": 1707,
          "sku": "LLE-2580.3IF.18F"
        },
        "3.2": {
          "length": 1832,
          "sku": "LLE-2580.32F.18F"
        },
        "3.4": {
          "length": 1957,
          "sku": "LLE-2580.34F.18F"
        },
        "3.6": {
          "length": 2082,
          "sku": "LLE-2580.36F.18F"
        },
        "3.8": {
          "length": 2207,
          "sku": "LLE-2580.38F.18F"
        },
        "4": {
          "length": 2267,
          "sku": "LLE-2580.4IF.18F"
        },
        "4.3": {
          "length": 2457,
          "sku": "LLE-2580.43F.18F"
        },
        "4.4": {
          "length": 2517,
          "sku": "LLE-2580.44F.18F"
        },
        "4.8": {
          "length": 2767,
          "sku": "LLE-2580.48F.18F"
        },
        "5": {
          "length": 2832,
          "sku": "LLE-2580.5IF.18F"
        },
        "5.2": {
          "length": 2957,
          "sku": "LLE-2580.52F.18F"
        },
        "5.3": {
          "length": 3017,
          "sku": "LLE-2580.53F.18F"
        },
        "5.4": {
          "length": 3082,
          "sku": "LLE-2580.54F.18F"
        },
        "5.6": {
          "length": 3207,
          "sku": "LLE-2580.56F.18F"
        },
        "5.7": {
          "length": 3267,
          "sku": "LLE-2580.57F.18F"
        },
        "5.8": {
          "length": 3332,
          "sku": "LLE-2580.58F.18F"
        },
        "6": {
          "length": 3392,
          "sku": "LLE-2580.6IF.18F"
        }
      },
      "ML": {
        "1": {
          "length": 570,
          "sku": "LLE-2580.1ML.18F"
        },
        "2": {
          "length": 1130,
          "sku": "LLE-2580.2ML.18F"
        },
        "2.8": {
          "length": 1630,
          "sku": "LLE-2580.28M.18F"
        },
        "3": {
          "length": 1695,
          "sku": "LLE-2580.3ML.18F"
        },
        "3.2": {
          "length": 1820,
          "sku": "LLE-2580.32M.18F"
        },
        "3.6": {
          "length": 2070,
          "sku": "LLE-2580.36M.18F"
        },
        "4": {
          "length": 2255,
          "sku": "LLE-2580.4ML.18F"
        },
        "4.3": {
          "length": 2445,
          "sku": "LLE-2580.43M.18F"
        },
        "4.4": {
          "length": 2505,
          "sku": "LLE-2580.44M.18F"
        },
        "4.5": {
          "length": 2570,
          "sku": "LLE-2580.45M.18F"
        },
        "4.8": {
          "length": 2755,
          "sku": "LLE-2580.48M.18F"
        },
        "5": {
          "length": 2820,
          "sku": "LLE-2580.5ML.18F"
        },
        "5.2": {
          "length": 2945,
          "sku": "LLE-2580.52M.18F"
        },
        "5.3": {
          "length": 3005,
          "sku": "LLE-2580.53M.18F"
        },
        "5.8": {
          "length": 3320,
          "sku": "LLE-2580.58M.18F"
        },
        "6": {
          "length": 3380,
          "sku": "LLE-2580.6ML.18F"
        }
      }
    }
  },
  "LLP-4536": {
    "name": "SKYLINE",
    "code": "LLP-4536",
    "sheet": "SKYLINE",
    "installType": "PENDENTE",
    "modules": {
      "IN": {
        "1": {
          "length": 575,
          "sku": "LLP-4536.1IN.48F"
        },
        "1.7": {
          "length": 1010,
          "sku": "LLP-4536.17I.48F"
        },
        "1.8": {
          "length": 1075,
          "sku": "LLP-4536.18I.48F"
        },
        "2": {
          "length": 1135,
          "sku": "LLP-4536.2IN.48F"
        },
        "2.1": {
          "length": 1200,
          "sku": "LLP-4536.21I.48F"
        },
        "2.2": {
          "length": 1260,
          "sku": "LLP-4536.22I.48F"
        },
        "2.5": {
          "length": 1450,
          "sku": "LLP-4536.25I.48F"
        },
        "2.6": {
          "length": 1510,
          "sku": "LLP-4536.26I.48F"
        },
        "3": {
          "length": 1700,
          "sku": "LLP-4536.3IN.48F"
        },
        "3.1": {
          "length": 1760,
          "sku": "LLP-4536.31I.48F"
        },
        "3.3": {
          "length": 1885,
          "sku": "LLP-4536.33I.48F"
        },
        "3.4": {
          "length": 1950,
          "sku": "LLP-4536.34I.48F"
        },
        "3.5": {
          "length": 2010,
          "sku": "LLP-4536.35I.48F"
        },
        "3.8": {
          "length": 2200,
          "sku": "LLP-4536.38I.48F"
        },
        "4": {
          "length": 2260,
          "sku": "LLP-4536.4IN.48F"
        },
        "4.5": {
          "length": 2575,
          "sku": "LLP-4536.45I.48F"
        },
        "4.7": {
          "length": 2700,
          "sku": "LLP-4536.47I.48F"
        },
        "5": {
          "length": 2825,
          "sku": "LLP-4536.5IN.48F"
        },
        "5.2": {
          "length": 2950,
          "sku": "LLP-4536.52I.48F"
        },
        "5.3": {
          "length": 3010,
          "sku": "LLP-4536.53I.48F"
        },
        "6": {
          "length": 3385,
          "sku": "LLP-4536.6IN.48F"
        }
      },
      "IF": {
        "1": {
          "length": 575,
          "sku": "LLP-4536.2IF48F"
        },
        "2": {
          "length": 1135,
          "sku": "LLP-4536.2IF.48F"
        },
        "2.5": {
          "length": 1450,
          "sku": "LLP-4536.25F.48F"
        },
        "2.8": {
          "length": 1635,
          "sku": "LLP-4536.28F.48F"
        },
        "3": {
          "length": 1700,
          "sku": "LLP-4536.3IF.48F"
        },
        "3.1": {
          "length": 1760,
          "sku": "LLP-4536.31F.48F"
        },
        "3.4": {
          "length": 1950,
          "sku": "LLP-4536.34F.48F"
        },
        "4": {
          "length": 2260,
          "sku": "LLP-4536.4IF.48F"
        },
        "4.2": {
          "length": 2385,
          "sku": "LLP-4536.42F.48F"
        },
        "4.3": {
          "length": 2450,
          "sku": "LLP-4536.43F.48F"
        },
        "4.5": {
          "length": 2575,
          "sku": "LLP-4536.45F.48F"
        },
        "4.6": {
          "length": 2635,
          "sku": "LLP-4536.46F.48F"
        },
        "5": {
          "length": 2825,
          "sku": "LLP-4536.5IF.48F"
        },
        "5.4": {
          "length": 3075,
          "sku": "LLP-4536.54F.48F"
        },
        "5.5": {
          "length": 3135,
          "sku": "LLP-4536.55F.48F"
        },
        "6": {
          "length": 3385,
          "sku": "LLP-4536.6IF.48F"
        }
      },
      "ML": {
        "1": {
          "length": 570,
          "sku": "LLP-4536.1ML.48F"
        },
        "2": {
          "length": 1130,
          "sku": "LLP-4536.2ML.48F"
        },
        "2.7": {
          "length": 1570,
          "sku": "LLP-4536.27M.48F"
        },
        "3": {
          "length": 1695,
          "sku": "LLP-4536.3ML.48F"
        },
        "4": {
          "length": 2255,
          "sku": "LLP-4536.4ML.48F"
        },
        "4.1": {
          "length": 2320,
          "sku": "LLP-4536.41M.48F"
        },
        "4.2": {
          "length": 2380,
          "sku": "LLP-4536.42M.48F"
        },
        "5": {
          "length": 2820,
          "sku": "LLP-4536.5ML.48F"
        },
        "5.2": {
          "length": 2945,
          "sku": "LLP-4536.52M.48F"
        },
        "5.4": {
          "length": 3070,
          "sku": "LLP-4536.54M.48F"
        },
        "5.7": {
          "length": 3255,
          "sku": "LLP-4536.57M.48F"
        },
        "6": {
          "length": 3380,
          "sku": "LLP-4536.6ML.48F"
        }
      }
    }
  },
  "LLP-4945": {
    "name": "BLAZE",
    "code": "LLP-4945",
    "sheet": "BLAZE",
    "installType": "PENDENTE",
    "modules": {
      "IN": {
        "1": {
          "length": 575,
          "sku": "LLP-4945.1IN.48F"
        },
        "1.5": {
          "length": 885,
          "sku": "LLP-4945.15I.48F"
        },
        "1.6": {
          "length": 950,
          "sku": "LLP-4945.16I.48F"
        },
        "1.7": {
          "length": 1010,
          "sku": "LLP-4945.17I.48F"
        },
        "1.8": {
          "length": 1075,
          "sku": "LLP-4945.18I.48F"
        },
        "2": {
          "length": 1135,
          "sku": "LLP-4945.2IN.48F"
        },
        "2.1": {
          "length": 1200,
          "sku": "LLP-4945.21I.48F"
        },
        "2.2": {
          "length": 1260,
          "sku": "LLP-4945.22I.48F"
        },
        "2.4": {
          "length": 1385,
          "sku": "LLP-4945.24I.48F"
        },
        "2.5": {
          "length": 1450,
          "sku": "LLP-4945.25I.48F"
        },
        "2.6": {
          "length": 1510,
          "sku": "LLP-4945.26I.48F"
        },
        "2.7": {
          "length": 1575,
          "sku": "LLP-4945.27I.48F"
        },
        "2.8": {
          "length": 1635,
          "sku": "LLP-4945.28I.48F"
        },
        "3": {
          "length": 1700,
          "sku": "LLP-4945.3IN.48F"
        },
        "3.1": {
          "length": 1760,
          "sku": "LLP-4945.31I.48F"
        },
        "3.2": {
          "length": 1825,
          "sku": "LLP-4945.32I.48F"
        },
        "3.4": {
          "length": 1950,
          "sku": "LLP-4945.34I.48F"
        },
        "3.5": {
          "length": 2010,
          "sku": "LLP-4945.35I.48F"
        },
        "3.6": {
          "length": 2075,
          "sku": "LLP-4945.36I.48F"
        },
        "3.7": {
          "length": 2135,
          "sku": "LLP-4945.37I.48F"
        },
        "3.8": {
          "length": 2200,
          "sku": "LLP-4945.38I.48F"
        },
        "4": {
          "length": 2260,
          "sku": "LLP-4945.4IN.48F"
        },
        "4.1": {
          "length": 2325,
          "sku": "LLP-4945.41I.48F"
        },
        "4.2": {
          "length": 2385,
          "sku": "LLP-4945.42I.48F"
        },
        "4.3": {
          "length": 2450,
          "sku": "LLP-4945.43I.48F"
        },
        "4.4": {
          "length": 2510,
          "sku": "LLP-4945.44I.48F"
        },
        "4.5": {
          "length": 2575,
          "sku": "LLP-4945.45I.48F"
        },
        "4.7": {
          "length": 2700,
          "sku": "LLP-4945.47I.48F"
        },
        "5": {
          "length": 2825,
          "sku": "LLP-4945.5IN.48F"
        },
        "5.2": {
          "length": 2950,
          "sku": "LLP-4945.52I.48F"
        },
        "5.3": {
          "length": 3010,
          "sku": "LLP-4945.53I.48F"
        },
        "5.6": {
          "length": 3200,
          "sku": "LLP-4945.56I.48F"
        },
        "5.7": {
          "length": 3260,
          "sku": "LLP-4945.57I.48F"
        },
        "5.8": {
          "length": 3325,
          "sku": "LLP-4945.58I.48F"
        },
        "6": {
          "length": 3385,
          "sku": "LLP-4945.6IN.48F"
        }
      },
      "IF": {
        "1": {
          "length": 575,
          "sku": "LLP-4945.1IF.48F"
        },
        "2": {
          "length": 1135,
          "sku": "LLP-4945.2IF.48F"
        },
        "3": {
          "length": 1700,
          "sku": "LLP-4945.3IF.48F"
        },
        "3.1": {
          "length": 1760,
          "sku": "LLP-4945.31F.48F"
        },
        "3.2": {
          "length": 1825,
          "sku": "LLP-4945.32F.48F"
        },
        "3.3": {
          "length": 1885,
          "sku": "LLP-4945.33F.48F"
        },
        "3.4": {
          "length": 1950,
          "sku": "LLP-4945.34F.48F"
        },
        "3.5": {
          "length": 2010,
          "sku": "LLP-4945.35F.48F"
        },
        "3.6": {
          "length": 2075,
          "sku": "LLP-4945.36F.48F"
        },
        "3.7": {
          "length": 2135,
          "sku": "LLP-4945.37F.48F"
        },
        "3.8": {
          "length": 2200,
          "sku": "LLP-4945.38F.48F"
        },
        "4": {
          "length": 2260,
          "sku": "LLP-4945.4IF.48F"
        },
        "4.1": {
          "length": 2325,
          "sku": "LLP-4945.41F.48F"
        },
        "4.2": {
          "length": 2385,
          "sku": "LLP-4945.42F.48F"
        },
        "4.3": {
          "length": 2450,
          "sku": "LLP-4945.43F.48F"
        },
        "4.4": {
          "length": 2510,
          "sku": "LLP-4945.44F.48F"
        },
        "4.5": {
          "length": 2575,
          "sku": "LLP-4945.45F.48F"
        },
        "4.6": {
          "length": 2635,
          "sku": "LLP-4945.46F.48F"
        },
        "4.8": {
          "length": 2760,
          "sku": "LLP-4945.48F.48F"
        },
        "5": {
          "length": 2825,
          "sku": "LLP-4945.5IF.48F"
        },
        "5.1": {
          "length": 2885,
          "sku": "LLP-4945-51F.48F"
        },
        "5.2": {
          "length": 2950,
          "sku": "LLP-4945.52F.48F"
        },
        "5.3": {
          "length": 3010,
          "sku": "LLP-4945.53F.48F"
        },
        "5.6": {
          "length": 3200,
          "sku": "LLP-4945.56F.48F"
        },
        "5.7": {
          "length": 3260,
          "sku": "LLP-4945.57F.48F"
        },
        "6": {
          "length": 3385,
          "sku": "LLP-4945.6IF.48F"
        }
      },
      "ML": {
        "1": {
          "length": 570,
          "sku": "LLP-4945.1ML.48F"
        },
        "1.8": {
          "length": 1070,
          "sku": "LLP-4945.18M.48F"
        },
        "2": {
          "length": 1130,
          "sku": "LLP-4945.2ML.48F"
        },
        "2.6": {
          "length": 1505,
          "sku": "LLP-4945.26M.48F"
        },
        "2.8": {
          "length": 1630,
          "sku": "LLP-4945.28M.48F"
        },
        "3": {
          "length": 1695,
          "sku": "LLP-4945.3ML.48F"
        },
        "3.1": {
          "length": 1755,
          "sku": "LLP-4945.31M.48F"
        },
        "3.2": {
          "length": 1820,
          "sku": "LLP-4945.32M.48F"
        },
        "3.5": {
          "length": 2005,
          "sku": "LLP-4945.35M.48F"
        },
        "3.6": {
          "length": 2070,
          "sku": "LLP-4945.36M.48F"
        },
        "3.8": {
          "length": 2195,
          "sku": "LLP-4945.38M.48F"
        },
        "4": {
          "length": 2255,
          "sku": "LLP-4945.4ML.48F"
        },
        "4.1": {
          "length": 2320,
          "sku": "LLP-4945.41M.48F"
        },
        "4.2": {
          "length": 2380,
          "sku": "LLP-4945.42M.48F"
        },
        "4.3": {
          "length": 2445,
          "sku": "LLP-4945.43M.48F"
        },
        "4.4": {
          "length": 2505,
          "sku": "LLP-4945.44M.48F"
        },
        "4.7": {
          "length": 2695,
          "sku": "LLP-4945.47M.48F"
        },
        "4.8": {
          "length": 2755,
          "sku": "LLP-4945.48M.48F"
        },
        "5": {
          "length": 2820,
          "sku": "LLP-4945.5ML.48F"
        },
        "5.2": {
          "length": 2945,
          "sku": "LLP-4945.52M.48F"
        },
        "5.3": {
          "length": 3005,
          "sku": "LLP-4945.53M.48F"
        },
        "5.4": {
          "length": 3070,
          "sku": "LLP-4945.54M.48F"
        },
        "5.6": {
          "length": 3195,
          "sku": "LLP-4945.56M.48F"
        },
        "5.8": {
          "length": 3320,
          "sku": "LLP-4945.58M.48F"
        },
        "6": {
          "length": 3380,
          "sku": "LLP-4945.6ML.48F"
        }
      }
    }
  },
  "LLP-6060": {
    "name": "BLAZE",
    "code": "LLP-6060",
    "sheet": "BLAZE H",
    "installType": "PENDENTE",
    "modules": {
      "IN": {
        "2": {
          "length": 1135,
          "sku": "LLP-6060.2IN.48F"
        },
        "2.2": {
          "length": 1260,
          "sku": "LLP-6060.22I.48F"
        },
        "3": {
          "length": 1700,
          "sku": "LLP-6060.3IN.48F"
        },
        "3.1": {
          "length": 1760,
          "sku": "LLP-6060.31I.48F"
        },
        "4": {
          "length": 2260,
          "sku": "LLP-6060.4IN.48F"
        },
        "5": {
          "length": 2825,
          "sku": "LLP-6060.5IN.48F"
        },
        "6": {
          "length": 3385,
          "sku": "LLP-6060.6IN.48F"
        }
      },
      "IF": {
        "1": {
          "length": 575,
          "sku": "LLP-6060.1IF.48F"
        },
        "2": {
          "length": 1135,
          "sku": "LLP-6060.2IF.48F"
        },
        "3": {
          "length": 1700,
          "sku": "LLP-6060.3IF.48F"
        },
        "3.5": {
          "length": 2010,
          "sku": "LLP-6060.35F.48F"
        },
        "3.6": {
          "length": 2075,
          "sku": "LLP-6060.35F.48F"
        },
        "3.8": {
          "length": 2200,
          "sku": "LLP-6060.38F.48F"
        },
        "4": {
          "length": 2260,
          "sku": "LLP-6060.4IF.48F"
        },
        "4.6": {
          "length": 2635,
          "sku": "LLP-6060.46F.48F"
        },
        "4.8": {
          "length": 2760,
          "sku": "LLP-6060.48F.48F"
        },
        "5": {
          "length": 2825,
          "sku": "LLP-6060.5IF.48F"
        },
        "5.8": {
          "length": 3325,
          "sku": "LLP-6060.58F.48F"
        },
        "6": {
          "length": 3385,
          "sku": "LLP-6060.6IF.48F"
        }
      },
      "ML": {
        "1": {
          "length": 570,
          "sku": "LLP-6060.1ML.48F"
        },
        "2": {
          "length": 1130,
          "sku": "LLP-6060.2ML.48F"
        },
        "3": {
          "length": 1695,
          "sku": "LLP-6060.3ML.48F"
        },
        "4": {
          "length": 2255,
          "sku": "LLP-6060.4ML.48F"
        },
        "4.6": {
          "length": 2630,
          "sku": "LLP-6060.46M.48F"
        },
        "4.8": {
          "length": 2755,
          "sku": "LLP-6060.48M.48F"
        },
        "5": {
          "length": 2820,
          "sku": "LLP-6060.5ML.48F"
        }
      }
    }
  },
  "LLP-3336": {
    "name": "MINI BLAZE",
    "code": "LLP-3336",
    "sheet": "MINI BLAZE",
    "installType": "PENDENTE",
    "modules": {
      "IN": {
        "1": {
          "length": 575,
          "sku": "LLP-3336.1IN.48F"
        },
        "2": {
          "length": 1135,
          "sku": "LLP-3336.2IN.48F"
        },
        "2.3": {
          "length": 1325,
          "sku": "LLP-3336.23I.48F"
        },
        "3": {
          "length": 1700,
          "sku": "LLP-3336.3IN.48F"
        },
        "3.5": {
          "length": 2010,
          "sku": "LLP-3336.35I.48F"
        },
        "4": {
          "length": 2260,
          "sku": "LLP-3336.4IN.48F"
        },
        "5": {
          "length": 2825,
          "sku": "LLP-3336.5IN.48F"
        },
        "5.3": {
          "length": 3010,
          "sku": "LLP-3336.53I.48F"
        },
        "6": {
          "length": 3385,
          "sku": "LLP-3336.6IN.48F"
        }
      },
      "IF": {
        "1": {
          "length": 575,
          "sku": "LLP-3336.1IF.48F"
        },
        "2": {
          "length": 1135,
          "sku": "LLP-3336.2IF.48F"
        },
        "3": {
          "length": 1700,
          "sku": "LLP-336.3IF.48F"
        },
        "3.4": {
          "length": 1950,
          "sku": "LLP-3336.34F.48F"
        },
        "4": {
          "length": 2260,
          "sku": "LLP-3336.4IF.48F"
        },
        "4.2": {
          "length": 2385,
          "sku": "LLP-3336.42F.48F"
        },
        "4.6": {
          "length": 2635,
          "sku": "LLP-3336.46F.48F"
        },
        "4.7": {
          "length": 2700,
          "sku": "LLP-3336.47I.48F"
        },
        "5": {
          "length": 2825,
          "sku": "LLP-3336.5IF.48F"
        },
        "5.3": {
          "length": 3010,
          "sku": "LLP-3336.53F.48F"
        },
        "6": {
          "length": 3385,
          "sku": "LLP-3336.6IF.48F"
        }
      },
      "ML": {
        "1": {
          "length": 570,
          "sku": "LLP3336.1ML.48F"
        },
        "2": {
          "length": 1130,
          "sku": "LLP-3336.2ML.48F"
        },
        "2.3": {
          "length": 1320,
          "sku": "LLP-3336.23M.48F"
        },
        "3": {
          "length": 1695,
          "sku": "LLP-3336.3ML.48F"
        },
        "4": {
          "length": 2255,
          "sku": "LLP-3336.4ML.48F"
        },
        "4.2": {
          "length": 2380,
          "sku": "LLP-3336.42M.48F"
        },
        "5": {
          "length": 2820,
          "sku": "LLP-3336.5ML.48F"
        },
        "6": {
          "length": 3380,
          "sku": "LLP-3336.6ML.48F"
        }
      }
    }
  },
  "LLP-4251": {
    "name": "HIT",
    "code": "LLP-4251",
    "sheet": "HIT",
    "installType": "PENDENTE",
    "modules": {
      "IN": {
        "1": {
          "length": 575,
          "sku": "LLP-4251.1IN.48F"
        },
        "1.4": {
          "length": 825,
          "sku": "LLP-4251.14I.48F"
        },
        "1.6": {
          "length": 950,
          "sku": "LLP-4251.16I.48F"
        },
        "1.7": {
          "length": 1010,
          "sku": "LLP-4251.17I.48F"
        },
        "1.8": {
          "length": 1075,
          "sku": "LLP-4251.37I.48F"
        },
        "2": {
          "length": 1135,
          "sku": "LLP-4251.2IN.48F"
        },
        "2.1": {
          "length": 1200,
          "sku": "LLP-4251.21I.48F"
        },
        "2.2": {
          "length": 1260,
          "sku": "LLP-4251.22I.48F"
        },
        "2.3": {
          "length": 1325,
          "sku": "LLP-4251.23I.18F"
        },
        "2.4": {
          "length": 1385,
          "sku": "LLP-4251.24I.48F"
        },
        "2.5": {
          "length": 1450,
          "sku": "LLP-4251.25I.48F"
        },
        "2.6": {
          "length": 1510,
          "sku": "LLP-4251.26I.48F"
        },
        "2.8": {
          "length": 1635,
          "sku": "LLP-4251.28I.48F"
        },
        "3": {
          "length": 1700,
          "sku": "LLP-4251.3IN.48F"
        },
        "3.2": {
          "length": 1825,
          "sku": "LLP-4251.32I.48F"
        },
        "3.4": {
          "length": 1950,
          "sku": "LLP-4251.34I.48F"
        },
        "3.8": {
          "length": 2200,
          "sku": "LLP-4251.38I.48F"
        },
        "4": {
          "length": 2260,
          "sku": "LLP-4251.4IN.48F"
        },
        "4.1": {
          "length": 2325,
          "sku": "LLP-4251.41I.48F"
        },
        "4.2": {
          "length": 2385,
          "sku": "LLP-4251.42I.48F"
        },
        "4.4": {
          "length": 2510,
          "sku": "LLP-4251.44I.48F"
        },
        "5": {
          "length": 2825,
          "sku": "LLP-4251.5IN.48F"
        },
        "5.2": {
          "length": 2950,
          "sku": "LLP-4251.52I.48F"
        },
        "5.3": {
          "length": 3010,
          "sku": "LLP-4251.53I.48F"
        },
        "5.4": {
          "length": 3075,
          "sku": "LLP-4251.54I.48F"
        },
        "6": {
          "length": 3385,
          "sku": "LLP-4251.6IN.48F"
        }
      },
      "IF": {
        "1": {
          "length": 575,
          "sku": "LLP-4251.1IF.48F"
        },
        "2": {
          "length": 1135,
          "sku": "LLP-4251.2IF.48F"
        },
        "2.7": {
          "length": 1575,
          "sku": "LLP-4251.27F.48F"
        },
        "2.8": {
          "length": 1635,
          "sku": "LLP-4251.27F.48F"
        },
        "3": {
          "length": 1700,
          "sku": "LLP-4251.3IF.48F"
        },
        "3.1": {
          "length": 1760,
          "sku": "LLP-4251.31F.48F"
        },
        "3.3": {
          "length": 1885,
          "sku": "LLP-4251.33F.48F"
        },
        "3.5": {
          "length": 2010,
          "sku": "LLP-4251.35F.48F"
        },
        "3.6": {
          "length": 2075,
          "sku": "LLP-4251.36F.48F"
        },
        "3.7": {
          "length": 2135,
          "sku": "LLP-4251.37F.48F"
        },
        "3.8": {
          "length": 2200,
          "sku": "LLP-4251.38F.48F"
        },
        "4": {
          "length": 2260,
          "sku": "LLP-4251.4IF.48F"
        },
        "4.2": {
          "length": 2385,
          "sku": "LLP-4251.42F.48F"
        },
        "4.4": {
          "length": 2510,
          "sku": "LLP-4251.44F.48F"
        },
        "4.6": {
          "length": 2635,
          "sku": "LLP-4251.46F.48F"
        },
        "4.8": {
          "length": 2760,
          "sku": "LLP-4251.48F.48F"
        },
        "5": {
          "length": 2825,
          "sku": "LLP-4251.5IF.48F"
        },
        "5.1": {
          "length": 2885,
          "sku": "LLP-4251.51F.48F"
        },
        "5.2": {
          "length": 2950,
          "sku": "LLP-4251.52F.48F"
        },
        "6": {
          "length": 3385,
          "sku": "LLP-4251.6IF.48F"
        }
      },
      "ML": {
        "1": {
          "length": 570,
          "sku": "LLP-4251.1ML.48F"
        },
        "1.1": {
          "length": 630,
          "sku": "LLP-4251.11M.48F"
        },
        "2": {
          "length": 1130,
          "sku": "LLP-4251.2ML.48F"
        },
        "3": {
          "length": 1695,
          "sku": "LLP-4251.3ML.48F"
        },
        "3.4": {
          "length": 1945,
          "sku": "LLP-4251.34F.48F"
        },
        "4": {
          "length": 2255,
          "sku": "LLP-4251.4ML.48F"
        },
        "4.6": {
          "length": 2630,
          "sku": "LLP-4251.46M.48F"
        },
        "5": {
          "length": 2820,
          "sku": "LLP-4251.5ML.48F"
        },
        "6": {
          "length": 3380,
          "sku": "LLP-4251.6ML.48F"
        }
      }
    }
  },
  "LLP-4450": {
    "name": "EASY H PLUS",
    "code": "LLP-4450",
    "sheet": "EASY H PLUS",
    "installType": "PENDENTE",
    "modules": {
      "IN": {
        "1": {
          "length": 575,
          "sku": "LLP-4450.1IN.48F"
        },
        "1.7": {
          "length": 1010,
          "sku": "LLP-4450.17I.48F"
        },
        "2": {
          "length": 1135,
          "sku": "LLP-4450.2IN.48F"
        },
        "2.1": {
          "length": 1200,
          "sku": "LLP-4450.21I.48F"
        },
        "2.2": {
          "length": 1260,
          "sku": "LLP-4450.22I.48F"
        },
        "2.4": {
          "length": 1385,
          "sku": "LLP-4450.24I.48F"
        },
        "2.5": {
          "length": 1450,
          "sku": "LLP-4450.25I.48F"
        },
        "2.7": {
          "length": 1575,
          "sku": "LLP-4450.27I.48F"
        },
        "2.8": {
          "length": 1635,
          "sku": "LLP-4450.28I.48F"
        },
        "3": {
          "length": 1700,
          "sku": "LLP-4450.3IN.48F"
        },
        "3.1": {
          "length": 1760,
          "sku": "LLP-4450.31I.48F"
        },
        "3.4": {
          "length": 1950,
          "sku": "LLP-4450.34I.48F"
        },
        "3.5": {
          "length": 2010,
          "sku": "LLP-4450.35I.48F"
        },
        "3.6": {
          "length": 2075,
          "sku": "LLP-4450.36I.48F"
        },
        "3.8": {
          "length": 2200,
          "sku": "LLP-4450.38I.48F"
        },
        "4": {
          "length": 2260,
          "sku": "LLP-4450.4IN.48F"
        },
        "4.2": {
          "length": 2385,
          "sku": "LLP-4450.42I.48F"
        },
        "4.3": {
          "length": 2450,
          "sku": "LLP-4450.43I.48F"
        },
        "4.4": {
          "length": 2510,
          "sku": "LLP-4450.44I.48F"
        },
        "4.7": {
          "length": 2700,
          "sku": "LLP-4450.47I.48F"
        },
        "4.8": {
          "length": 2760,
          "sku": "LLP-4450.48I.48F"
        },
        "5": {
          "length": 2825,
          "sku": "LLP-4450.5IN.48F"
        },
        "5.3": {
          "length": 3010,
          "sku": "LLP-4450.53I.48F"
        },
        "5.4": {
          "length": 3075,
          "sku": "LLP-4450.54I.48F"
        },
        "5.5": {
          "length": 3135,
          "sku": "LLP-4450.55I.48F"
        },
        "5.6": {
          "length": 3200,
          "sku": "LLP-4450.56I.48F"
        },
        "5.7": {
          "length": 3260,
          "sku": "LLP-4450.57I.48F"
        },
        "6": {
          "length": 3385,
          "sku": "LLP-4450.6IN.48F"
        }
      },
      "IF": {
        "1": {
          "length": 575,
          "sku": "LLP-4450.1IF.48F"
        },
        "2": {
          "length": 1135,
          "sku": "LLP-4450.2IF.48F"
        },
        "3": {
          "length": 1700,
          "sku": "LLP-4450.3IF.48F"
        },
        "3.1": {
          "length": 1760,
          "sku": "LLP-4450.31F.48F"
        },
        "3.4": {
          "length": 1950,
          "sku": "LLP-4450.34F.48F"
        },
        "3.5": {
          "length": 2010,
          "sku": "LLP-4450.35F.48F"
        },
        "3.6": {
          "length": 2075,
          "sku": "LLP-4450.36F.48F"
        },
        "3.8": {
          "length": 2200,
          "sku": "LLP-4450.38F.48F"
        },
        "4": {
          "length": 2260,
          "sku": "LLP-4450.4IF.48F"
        },
        "4.1": {
          "length": 2325,
          "sku": "LLP-4450.41F.48F"
        },
        "4.2": {
          "length": 2385,
          "sku": "LLP-4450.42F.48F"
        },
        "4.4": {
          "length": 2510,
          "sku": "LLP-4450.44F.48F"
        },
        "4.5": {
          "length": 2575,
          "sku": "LLP-4450.45F.48F"
        },
        "4.6": {
          "length": 2635,
          "sku": "LLP-4450.46F.48F"
        },
        "4.8": {
          "length": 2760,
          "sku": "LLP-4450.48F.48F"
        },
        "5": {
          "length": 2825,
          "sku": "LLP-4450.5IF.48F"
        },
        "5.2": {
          "length": 2950,
          "sku": "LLP-4450.52F.48F"
        },
        "5.3": {
          "length": 3010,
          "sku": "LLP-4450.53F.48F"
        },
        "5.5": {
          "length": 3135,
          "sku": "LLP-4450.55F.48F"
        },
        "6": {
          "length": 3385,
          "sku": "LLP-4450.6IF.48F"
        }
      },
      "ML": {
        "1": {
          "length": 570,
          "sku": "LLP-4450.1ML.48F"
        },
        "2": {
          "length": 1130,
          "sku": "LLP-4450.2ML.48F"
        },
        "3": {
          "length": 1695,
          "sku": "LLP-4450.3ML.48F"
        },
        "4": {
          "length": 2255,
          "sku": "LLP-4450.4ML.48F"
        },
        "4.1": {
          "length": 2320,
          "sku": "LLP-4450.41M.48F"
        },
        "4.2": {
          "length": 2380,
          "sku": "LLP-4450.42M.48F"
        },
        "4.3": {
          "length": 2445,
          "sku": "LLP-4450.43M.48F"
        },
        "4.4": {
          "length": 2505,
          "sku": "LLP-4450.44M.48F"
        },
        "5": {
          "length": 2820,
          "sku": "LLP-4450.5ML.48F"
        },
        "5.3": {
          "length": 3005,
          "sku": "LLP-4450.53M.48F"
        },
        "5.4": {
          "length": 3070,
          "sku": "LLP-4450.54M.48F"
        },
        "5.6": {
          "length": 3195,
          "sku": "LLP-4450.56M.48F"
        },
        "6": {
          "length": 3380,
          "sku": "LLP-4450.6ML.48F"
        }
      }
    }
  },
  "LLP-4451": {
    "name": "SHARP",
    "code": "LLP-4451",
    "sheet": "SHARP",
    "installType": "PENDENTE",
    "modules": {
      "IN": {
        "1": {
          "length": 577,
          "sku": "LLP-4451.1IN.47F"
        },
        "2": {
          "length": 1140,
          "sku": "LLP-4451.2IN.47F"
        },
        "2.1": {
          "length": 1202,
          "sku": "LLP-4451.21I.47F"
        },
        "2.6": {
          "length": 1515,
          "sku": "LLP-4451.26I.47F"
        },
        "3": {
          "length": 1702,
          "sku": "LLP-4451.3IN.47F"
        },
        "3.4": {
          "length": 1952,
          "sku": "LLP-4451-34I.47F"
        },
        "4": {
          "length": 2265,
          "sku": "LLP-4451.4IN.47F"
        },
        "4.3": {
          "length": 2452,
          "sku": "LLP-4451.43I.47F"
        },
        "5": {
          "length": 2827,
          "sku": "LLP-4451.5IN.47F"
        },
        "5.2": {
          "length": 2952,
          "sku": "LLP-4451.52I.47F"
        },
        "6": {
          "length": 3390,
          "sku": "LLP-4451.6IN.47F"
        }
      },
      "IF": {
        "1": {
          "length": 577,
          "sku": "LLP-4451.1IF.47F"
        },
        "2": {
          "length": 1140,
          "sku": "LLP-4451.2IF.47F"
        },
        "3": {
          "length": 1702,
          "sku": "LLP-4451.3IF.47F"
        },
        "4": {
          "length": 2265,
          "sku": "LLP-4451.4IF.47F"
        },
        "5": {
          "length": 2827,
          "sku": "LLP-4451.5IF.47F"
        },
        "5.2": {
          "length": 2952,
          "sku": "LLP-4451.52F.47F"
        },
        "6": {
          "length": 3390,
          "sku": "LLP-4451.6IF.47F"
        }
      },
      "ML": {
        "1": {
          "length": 577,
          "sku": "LLP-4451.1ML.47F"
        },
        "2": {
          "length": 1140,
          "sku": "LLP-4451.2ML.47F"
        },
        "3": {
          "length": 1702,
          "sku": "LLP-4451.3ML.47F"
        },
        "4": {
          "length": 2265,
          "sku": "LLP-4451.4ML.47F"
        },
        "5": {
          "length": 2827,
          "sku": "LLP-4451.5ML.47F"
        },
        "6": {
          "length": 3390,
          "sku": "LLP-4451.6ML.47F"
        }
      }
    }
  },
  "LLP-4825": {
    "name": "FLOW",
    "code": "LLP-4825",
    "sheet": "FLOW",
    "installType": "PENDENTE",
    "modules": {
      "IN": {
        "2.6": {
          "length": 1510,
          "sku": "LLP-4825.26I.48F"
        },
        "3.3": {
          "length": 1885,
          "sku": "LLP-4825.33I.48F"
        },
        "3.4": {
          "length": 1950,
          "sku": "LLP-4825.34I.48F"
        },
        "5": {
          "length": 2825,
          "sku": "LLP-4825.5IN.48F"
        },
        "5.3": {
          "length": 3010,
          "sku": "LLP-4825.53I.48F"
        },
        "5.6": {
          "length": 3200,
          "sku": "LLP-4825.320.45F"
        }
      },
      "IF": {},
      "ML": {}
    }
  },
  "LLP-4452": {
    "name": "SOFT",
    "code": "LLP-4452",
    "sheet": "SOFT",
    "installType": "SOBREPOR",
    "modules": {
      "IN": {
        "1": {
          "length": 575,
          "sku": "LLP-4452.1IN.48F"
        },
        "2": {
          "length": 1135,
          "sku": "LLP-4452.2IN.48F"
        },
        "2.1": {
          "length": 1200,
          "sku": "LLP-4452.21I.48F"
        },
        "2.7": {
          "length": 1575,
          "sku": "LLP-4452.27I.48F"
        },
        "3": {
          "length": 1700,
          "sku": "LLP-4452.3IN.48F"
        },
        "3.1": {
          "length": 1760,
          "sku": "LLP-4452.31I.48F"
        },
        "3.4": {
          "length": 1950,
          "sku": "LLP-4452.34I.48F"
        },
        "4": {
          "length": 2260,
          "sku": "LLP-4452.4IN.48F"
        },
        "4.5": {
          "length": 2575,
          "sku": "LLP-4452.45I.48F"
        },
        "5": {
          "length": 2825,
          "sku": "LLP-4452.5IN.48F"
        },
        "5.6": {
          "length": 3200,
          "sku": "LLP-4452.56I.48F"
        },
        "6": {
          "length": 3385,
          "sku": "LLP-4452.6IN.48F"
        }
      },
      "IF": {
        "1": {
          "length": 575,
          "sku": "LLP-4452.1IF.48F"
        },
        "2": {
          "length": 1135,
          "sku": "LLP-4452.2IF.48F"
        },
        "3": {
          "length": 1700,
          "sku": "LLP-4452.3IF.48F"
        },
        "4": {
          "length": 2260,
          "sku": "LLP-4452.4IF.48F"
        },
        "4.5": {
          "length": 2575,
          "sku": "LLP-4452.45F.48F"
        },
        "5": {
          "length": 2825,
          "sku": "LLP-4452.5IF.48F"
        },
        "6": {
          "length": 3385,
          "sku": "LLP-4452.6IF.48F"
        }
      },
      "ML": {
        "1": {
          "length": 570,
          "sku": "LLP-4452.1ML.48F"
        },
        "2": {
          "length": 1130,
          "sku": "LLP-4452.2ML.48F"
        },
        "3": {
          "length": 1695,
          "sku": "LLP-4452.3ML.48F"
        },
        "4": {
          "length": 2255,
          "sku": "LLP-4452.4ML.48F"
        },
        "4.3": {
          "length": 2445,
          "sku": "LLP-4452.43M.48F"
        },
        "5": {
          "length": 2820,
          "sku": "LLP-4452.5ML.48F"
        },
        "6": {
          "length": 3380,
          "sku": "LLP-4452.6ML.48F"
        }
      }
    }
  },
  "LLP-3435": {
    "name": "SMART MINI",
    "code": "LLP-3435",
    "sheet": "SMART MINI",
    "installType": "PENDENTE",
    "modules": {
      "IN": {
        "1": {
          "length": 575,
          "sku": "LLP-3435.1IN.38F"
        },
        "1.5": {
          "length": 885,
          "sku": "LLP-3435.15I.38F"
        },
        "1.6": {
          "length": 950,
          "sku": "LLP-3435.16I.38F"
        },
        "1.7": {
          "length": 1010,
          "sku": "LLP-3435.17I.38F"
        },
        "2": {
          "length": 1135,
          "sku": "LLP-3435.2IN.38F"
        },
        "2.2": {
          "length": 1260,
          "sku": "LLP-3435.22I.38F"
        },
        "2.4": {
          "length": 1385,
          "sku": "LLP-3435.24I.38F"
        },
        "2.7": {
          "length": 1575,
          "sku": "LLP-3435.27I.38F"
        },
        "3": {
          "length": 1700,
          "sku": "LLP-3435.3IN.38F"
        },
        "3.4": {
          "length": 1950,
          "sku": "LLP-3435.34I.38F"
        },
        "3.5": {
          "length": 2010,
          "sku": "LLP-3435.35I.38F"
        },
        "4": {
          "length": 2260,
          "sku": "LLP-3435.4IN.38F"
        },
        "4.2": {
          "length": 2385,
          "sku": "LLP-3435.42I.38F"
        },
        "4.3": {
          "length": 2450,
          "sku": "LLP-3435.43I.38F"
        },
        "4.4": {
          "length": 2510,
          "sku": "LLP-3435.44I.38F"
        },
        "4.7": {
          "length": 2700,
          "sku": "LLP-3435.47I.38F"
        },
        "4.8": {
          "length": 2760,
          "sku": "LLP-3435.48I.38F"
        },
        "5": {
          "length": 2825,
          "sku": "LLP-3435.5IN.38F"
        },
        "5.3": {
          "length": 3010,
          "sku": "LLP-3435.53I.38F"
        },
        "6": {
          "length": 3385,
          "sku": "LLP-3435.6IN.38F"
        }
      },
      "IF": {
        "1": {
          "length": 575,
          "sku": "LLP-3435.1IF.38F"
        },
        "2": {
          "length": 1135,
          "sku": "LLP-3435.2IF.38F"
        },
        "2.1": {
          "length": 1200,
          "sku": "LLP-3435.21F.38F"
        },
        "3": {
          "length": 1700,
          "sku": "LLP-3435.3IF.38F"
        },
        "3.1": {
          "length": 1760,
          "sku": "LLP-3435.31F.38F"
        },
        "3.3": {
          "length": 1885,
          "sku": "LLP-3435.33F.38F"
        },
        "3.4": {
          "length": 1950,
          "sku": "LLP-3435.34F.38F"
        },
        "3.6": {
          "length": 2075,
          "sku": "LLP-3435.36F.38F"
        },
        "3.7": {
          "length": 2135,
          "sku": "LLP-3435.37F.38F"
        },
        "3.8": {
          "length": 2200,
          "sku": "LLP-3435.38F.38F"
        },
        "4": {
          "length": 2260,
          "sku": "LLP-3435.4IF.38F"
        },
        "4.2": {
          "length": 2385,
          "sku": "LLP-3435.42F.38F"
        },
        "4.3": {
          "length": 2450,
          "sku": "LLP-3435.43F.38F"
        },
        "4.4": {
          "length": 2510,
          "sku": "LLP-3435.44F.38F"
        },
        "4.5": {
          "length": 2575,
          "sku": "LLP-3435.45F.38F"
        },
        "4.7": {
          "length": 2700,
          "sku": "LLP-3435.47F.38F"
        },
        "4.8": {
          "length": 2760,
          "sku": "LLP-3435.48F.38F"
        },
        "5": {
          "length": 2825,
          "sku": "LLP-3435.5IF.38F"
        },
        "5.1": {
          "length": 2885,
          "sku": "LLP-3435.51F.38F"
        },
        "5.2": {
          "length": 2950,
          "sku": "LLP-3435.52F.38F"
        },
        "5.3": {
          "length": 3010,
          "sku": "LLP-3435.53F.38F"
        },
        "5.4": {
          "length": 3075,
          "sku": "LLP-3435.54F.38F"
        },
        "5.5": {
          "length": 3135,
          "sku": "LLP-3435.55F.38F"
        },
        "6": {
          "length": 3385,
          "sku": "LLP-3435.6IF.38F"
        }
      },
      "ML": {
        "1": {
          "length": 570,
          "sku": "LLP-3435.1ML.38F"
        },
        "2": {
          "length": 1130,
          "sku": "LLP-3435.2ML.38F"
        },
        "2.1": {
          "length": 1195,
          "sku": "LLP-3435.21M.38F"
        },
        "2.3": {
          "length": 1320,
          "sku": "LLP-3435.23M.38F"
        },
        "2.6": {
          "length": 1505,
          "sku": "LLP-3435.26M.38F"
        },
        "3": {
          "length": 1695,
          "sku": "LLP-3435.3ML.38F"
        },
        "3.1": {
          "length": 1755,
          "sku": "LLP-3435.31M.38F"
        },
        "3.2": {
          "length": 1820,
          "sku": "LLP-3435.32M.38F"
        },
        "3.6": {
          "length": 2070,
          "sku": "LLP-3435.36M.39F"
        },
        "4": {
          "length": 2255,
          "sku": "LLP-3435.4ML.38F"
        },
        "4.1": {
          "length": 2320,
          "sku": "LLP-3435.41M.38F"
        },
        "4.2": {
          "length": 2380,
          "sku": "LLP-3435.42M.38F"
        },
        "4.5": {
          "length": 2570,
          "sku": "LLP-3435.45M.38F"
        },
        "4.6": {
          "length": 2630,
          "sku": "LLP-3435.46M.38F"
        },
        "5": {
          "length": 2820,
          "sku": "LLP-3435.5ML.38F"
        },
        "5.3": {
          "length": 3005,
          "sku": "LLP-3435.53M.38F"
        },
        "5.5": {
          "length": 3130,
          "sku": "LLP-3435.55M.38F"
        },
        "6": {
          "length": 3380,
          "sku": "LLP-3435.6ML.38F"
        }
      }
    }
  },
  "LLP-4100": {
    "name": "EASY G",
    "code": "LLP-4100",
    "sheet": "EASY G",
    "installType": "PENDENTE",
    "modules": {
      "IN": {
        "1": {
          "length": 575,
          "sku": "LLP-4100.1IN.48F"
        },
        "2": {
          "length": 1135,
          "sku": "LLP-4100.2IN.48F"
        },
        "2.1": {
          "length": 1200,
          "sku": "LLP-4100.21I.48F"
        },
        "2.6": {
          "length": 1510,
          "sku": "LLP-4100.152.48F"
        },
        "2.8": {
          "length": 1635,
          "sku": "LLP-4100.28I.48F"
        },
        "3": {
          "length": 1700,
          "sku": "LLP-4100.3IN.48F"
        },
        "3.5": {
          "length": 2010,
          "sku": "LLP-4100.35I.48F"
        },
        "4": {
          "length": 2260,
          "sku": "LLP-4100.4IN.48F"
        },
        "4.2": {
          "length": 2385,
          "sku": "LLP-4100.42I.48F"
        },
        "4.3": {
          "length": 2450,
          "sku": "LLP-4100.43I.48F"
        },
        "4.7": {
          "length": 2700,
          "sku": "LLP-4100.47I.48F"
        },
        "4.8": {
          "length": 2760,
          "sku": "LLP-4100.48I.48F"
        },
        "5": {
          "length": 2825,
          "sku": "LLP-4100.5IN.48F"
        },
        "5.2": {
          "length": 2950,
          "sku": "LLP-4100.52I.48F"
        },
        "5.7": {
          "length": 3260,
          "sku": "LLP-4100.57I.48F"
        },
        "6": {
          "length": 3385,
          "sku": "LLP-4100.6IN.48F"
        }
      },
      "IF": {
        "1": {
          "length": 575,
          "sku": "LLP-4100.1IF.48F"
        },
        "2": {
          "length": 1135,
          "sku": "LLP-4100.2IF.48F"
        },
        "2.1": {
          "length": 1200,
          "sku": "LLP-4100.2IF.48F"
        },
        "2.6": {
          "length": 1510,
          "sku": "LLP-4100.26F.48F"
        },
        "3": {
          "length": 1700,
          "sku": "LLP-4100.3IF.48F"
        },
        "3.5": {
          "length": 2010,
          "sku": "LLP-4100.35F.48F"
        },
        "3.7": {
          "length": 2135,
          "sku": "LLP-4100.37F.48F"
        },
        "3.8": {
          "length": 2200,
          "sku": "LLP-4100.38F.48F"
        },
        "4": {
          "length": 2260,
          "sku": "LLP-4100.4IF.48F"
        },
        "4.2": {
          "length": 2385,
          "sku": "LLP-4100.42F.48F"
        },
        "4.4": {
          "length": 2510,
          "sku": "LLP-4100.44F.48F"
        },
        "4.6": {
          "length": 2635,
          "sku": "LLP-4450.46F.48F"
        },
        "5": {
          "length": 2825,
          "sku": "LLP-4100.5IF.48F"
        },
        "5.3": {
          "length": 3010,
          "sku": "LLP-4100.53F.48F"
        },
        "5.6": {
          "length": 3200,
          "sku": "LLP-4100.56F.48F"
        },
        "5.7": {
          "length": 3260,
          "sku": "LLP-4100.57F.48F"
        },
        "5.8": {
          "length": 3325,
          "sku": "LLP-4100.58F.48F"
        },
        "6": {
          "length": 3385,
          "sku": "LLP-4100.6IF.48F"
        }
      },
      "ML": {
        "1": {
          "length": 570,
          "sku": "LLP-4100.1ML.48F"
        },
        "1.5": {
          "length": 880,
          "sku": "LLP-4100.15M.48F"
        },
        "2": {
          "length": 1130,
          "sku": "LLP-4100.2ML.48F"
        },
        "3": {
          "length": 1695,
          "sku": "LLP-4100.3ML.48F"
        },
        "3.7": {
          "length": 2130,
          "sku": "LLP-4100.37M.48F"
        },
        "4": {
          "length": 2255,
          "sku": "LLP-4100.4ML.48F"
        },
        "4.8": {
          "length": 2755,
          "sku": "LLP-4100.48M.48F"
        },
        "5": {
          "length": 2820,
          "sku": "LLP-4100.5ML.48F"
        },
        "5.1": {
          "length": 2880,
          "sku": "LLP-4100.51M.48F"
        },
        "5.2": {
          "length": 2945,
          "sku": "LLP-4100.52M.48F"
        },
        "5.7": {
          "length": 3255,
          "sku": "LLP-4100.57M.48F"
        },
        "6": {
          "length": 3380,
          "sku": "LLP-4100.6ML.48F"
        }
      }
    }
  }
};

// Lista de perfis disponíveis para o dropdown
export const PROFILE_OPTIONS = Object.entries(LED_CATALOG).map(([code, data]) => ({
  value: code,
  label: `${data.name} (${code})`,
  name: data.name,
  installType: data.installType,
}));
