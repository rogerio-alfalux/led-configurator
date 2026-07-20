/**
 * Mapeamento de fotos dos perfis de LED e Downlights.
 * URLs públicas permanentes via CDN (files.manuscdn.com).
 *
 * Para adicionar uma nova foto:
 * 1. Faça upload com: manus-upload-file caminho/da/imagem.png  (SEM --webdev)
 * 2. Adicione a entrada abaixo com a URL retornada.
 */

const CDN = "https://files.manuscdn.com/user_upload_by_module/session_file/310419663032619542";

// --- Perfis: mapeamento simples por código ------------------------------------
const PROFILE_PHOTOS_SIMPLE: Record<string, string> = {
  // BLAZE
  "LLE-2810": `${CDN}/vmGSTNLHjVCoVILp.png`, // BLAZE Embutir
  "LLS-3945": `${CDN}/bIRMniTCBfhRaGac.png`, // BLAZE Sobrepor
  "LLA-5945": `${CDN}/LJnUryUdBKQEmGLC.png`, // BLAZE Arandela
  "LLP-6060": `${CDN}/pdTGCQYrZGJilKKe.png`, // BLAZE H Pendente
  // MINI BLAZE
  "LLP-3336": `${CDN}/lihiQeClDNRvoGxC.png`, // MINI BLAZE Pendente
  "LLS-3336": `${CDN}/DSqdioYWejvYDEeD.png`, // MINI BLAZE Sobrepor
  // HIT
  "LLP-4251": `${CDN}/DcUAlMSZOeuYoyEP.png`, // HIT Pendente
  "LLA-3395": `${CDN}/wCZvbpprpyHYWvxc.png`, // HIT Arandela
  // EASY H PLUS
  "LLP-4450": `${CDN}/TtwikAuQTlPNptHP.png`, // EASY H PLUS Pendente
  "LLA-4450": `${CDN}/TtwikAuQTlPNptHP.png`, // EASY H PLUS Arandela (mesma foto do Pendente — EASYHPLUSP)
  // EASY PRIME
  "LLE-2580": `${CDN}/kqvDoVsaaZDHYCwT.png`, // EASY PRIME Embutir
  // SKYLINE
  "LLE-2052": `${CDN}/TVPsMQrEflnFoCgH.png`, // SKYLINE Embutir
  "LLP-4536": `${CDN}/jwQfZJCnOHMYPobB.png`, // SKYLINE Pendente
};

// --- SHARP: mapeamento por código + difusor D1 + difusor D2 ------------------
const SHARP_PHOTOS: Record<string, string> = {
  // SHARP ARANDELA (LLA-4451) - D1 simples
  "LLA-4451|DA|":  `${CDN}/uXWUvgNAVmhugXlN.png`,
  "LLA-4451|DB|":  `${CDN}/nfTTqmpSXPpAPvtM.png`,
  "LLA-4451|DC|":  `${CDN}/ZtOaAkdKcKfVyBlz.png`,
  // SHARP ARANDELA - D2 simples
  "LLA-4451||DA":  `${CDN}/YNsSutJnWbFKnJij.png`,
  "LLA-4451||DB":  `${CDN}/YNsSutJnWbFKnJij.png`,
  "LLA-4451||DC":  `${CDN}/kyJXDDhOyFozxDAX.png`,
  // SHARP ARANDELA - D1+D2
  "LLA-4451|DA|DA": `${CDN}/XMqBMWzdOlGvhWmk.png`,
  "LLA-4451|DA|DB": `${CDN}/vLTrArXVuyJgdlKd.png`,
  "LLA-4451|DA|DC": `${CDN}/XMqBMWzdOlGvhWmk.png`,
  "LLA-4451|DB|DA": `${CDN}/BKmcVTVxbyEUIgiZ.png`,
  "LLA-4451|DB|DB": `${CDN}/sbyQUzISEpzjExSQ.png`,
  "LLA-4451|DB|DC": `${CDN}/BKmcVTVxbyEUIgiZ.png`,
  "LLA-4451|DC|DA": `${CDN}/kyJXDDhOyFozxDAX.png`,
  "LLA-4451|DC|DB": `${CDN}/AiIaYVLnzEocudzC.png`,
  "LLA-4451|DC|DC": `${CDN}/AiIaYVLnzEocudzC.png`,
  // SHARP PENDENTE (LLP-4451) - D1 simples
  "LLP-4451|DA|":  `${CDN}/mfDtKryMIKArMYTK.png`,
  "LLP-4451|DB|":  `${CDN}/MhKVbBwOTJWOdSGY.png`,
  "LLP-4451|DC|":  `${CDN}/wxGnzTxpUbbklchT.png`,
  // SHARP PENDENTE - D2 simples
  "LLP-4451||DA":  `${CDN}/qpFkpEUKoXovCeWC.png`,
  "LLP-4451||DB":  `${CDN}/xDRcqBCELxePbzbZ.png`,
  "LLP-4451||DC":  `${CDN}/nrdxumeouhfCUNeE.png`,
  // SHARP PENDENTE - D1+D2
  "LLP-4451|DA|DA": `${CDN}/TINSeKcqdADwVHPi.png`,
  "LLP-4451|DA|DB": `${CDN}/RQJiahzdXjVGLQFz.png`,
  "LLP-4451|DA|DC": `${CDN}/TINSeKcqdADwVHPi.png`,
  "LLP-4451|DB|DA": `${CDN}/RbPEZWhQifMxCLQa.png`,
  "LLP-4451|DB|DB": `${CDN}/RVseQCPYwNcmPBFt.png`,
  "LLP-4451|DB|DC": `${CDN}/RbPEZWhQifMxCLQa.png`,
  "LLP-4451|DC|DA": `${CDN}/nrdxumeouhfCUNeE.png`,
  "LLP-4451|DC|DB": `${CDN}/zoziTfTcLxPSkZQh.png`,
  "LLP-4451|DC|DC": `${CDN}/zoziTfTcLxPSkZQh.png`,
};

// --- Downlights: mapeamento por "FAMÍLIA|NOME DO PRODUTO" --------------------
// A chave usa o nome exato do produto conforme consta no catálogo.
// Quando vários produtos compartilham a mesma foto, todos são listados.
export const DOWNLIGHT_PRODUCT_PHOTOS: Record<string, string> = {

  // -- AURA ------------------------------------------------------------------
  "AURA|AURA P RE 5W IP54":      `${CDN}/wzKuNNocWgXwkcqK.png`, // AURAPRE5W
  "AURA|AURA P QE 5W IP54":      `${CDN}/tqqfRNDanSLIPaih.png`, // AURAPQE5W

  // -- EASY LED POINT --------------------------------------------------------
  "EASY LED POINT|EASY LED POINT 1X1 2W 10º":          `${CDN}/LMwGpdQxLKpaBRPf.png`,
  "EASY LED POINT|EASY LED POINT 1X1 2W 48º":          `${CDN}/LMwGpdQxLKpaBRPf.png`,
  "EASY LED POINT|EASY LED POINT 1X3 6W 10º":          `${CDN}/erFoWMwqVPCGjMut.png`,
  "EASY LED POINT|EASY LED POINT 1X3 6W 10º NO FRAME": `${CDN}/erFoWMwqVPCGjMut.png`,
  "EASY LED POINT|EASY LED POINT 1X3 6W 10º ORIENTÁVEL":`${CDN}/erFoWMwqVPCGjMut.png`,
  "EASY LED POINT|EASY LED POINT 1X3 6W 48º":          `${CDN}/erFoWMwqVPCGjMut.png`,
  "EASY LED POINT|EASY LED POINT 1X3 6W 48º NO FRAME": `${CDN}/erFoWMwqVPCGjMut.png`,
  "EASY LED POINT|EASY LED POINT 1X3 6W 48º ORIENTÁVEL":`${CDN}/erFoWMwqVPCGjMut.png`,
  "EASY LED POINT|EASY LED POINT 1X6 6,5W 10º":        `${CDN}/KEFYWzseGMMaNQRf.png`,
  "EASY LED POINT|EASY LED POINT 1X6 6,5W 10º NO FRAME":`${CDN}/KEFYWzseGMMaNQRf.png`,
  "EASY LED POINT|EASY LED POINT 1X6 6,5W 10º ORIENTÁVEL":`${CDN}/KEFYWzseGMMaNQRf.png`,
  "EASY LED POINT|EASY LED POINT 1X6 6,5W 48º":        `${CDN}/KEFYWzseGMMaNQRf.png`,
  "EASY LED POINT|EASY LED POINT 1X6 6,5W 48º NO FRAME":`${CDN}/KEFYWzseGMMaNQRf.png`,
  "EASY LED POINT|EASY LED POINT 1X6 6,5W 48º ORIENTÁVEL":`${CDN}/KEFYWzseGMMaNQRf.png`,
  "EASY LED POINT|EASY LED POINT 1X6 13W 10º":         `${CDN}/KEFYWzseGMMaNQRf.png`,
  "EASY LED POINT|EASY LED POINT 1X6 13W 10º NO FRAME":`${CDN}/KEFYWzseGMMaNQRf.png`,
  "EASY LED POINT|EASY LED POINT 1X6 13W 10º ORIENTÁVEL":`${CDN}/KEFYWzseGMMaNQRf.png`,
  "EASY LED POINT|EASY LED POINT 1X6 13W 48º":         `${CDN}/KEFYWzseGMMaNQRf.png`,
  "EASY LED POINT|EASY LED POINT 1X6 13W 48º NO FRAME":`${CDN}/KEFYWzseGMMaNQRf.png`,
  "EASY LED POINT|EASY LED POINT 1X6 13W 48º ORIENTÁVEL":`${CDN}/KEFYWzseGMMaNQRf.png`,
  "EASY LED POINT|EASY LED POINT 2X6 13W 10º":         `${CDN}/DprlAtOWmfLXwDXM.png`,
  "EASY LED POINT|EASY LED POINT 2X6 13W 48º":         `${CDN}/DprlAtOWmfLXwDXM.png`,
  "EASY LED POINT|EASY LED POINT 2X6 26W 10º":         `${CDN}/DprlAtOWmfLXwDXM.png`,
  "EASY LED POINT|EASY LED POINT 2X6 26W 48º":         `${CDN}/DprlAtOWmfLXwDXM.png`,
  "EASY LED POINT|EASY LED POINT 3X3 18W 10º":         `${CDN}/eSWPvJLzwKMzilCT.png`,
  "EASY LED POINT|EASY LED POINT 3X3 18W 48º":         `${CDN}/eSWPvJLzwKMzilCT.png`,
  "EASY LED POINT|EASY LED POINT 3X6 19,5W 10º":       `${CDN}/TAMsBPRHjPlcccwe.png`,
  "EASY LED POINT|EASY LED POINT 3X6 19,5W 48º":       `${CDN}/TAMsBPRHjPlcccwe.png`,
  "EASY LED POINT|EASY LED POINT 3X6 39W 10º":         `${CDN}/TAMsBPRHjPlcccwe.png`,
  "EASY LED POINT|EASY LED POINT 3X6 39W 48º":         `${CDN}/TAMsBPRHjPlcccwe.png`,
  "EASY LED POINT|EASY LED POINT 4X6 26W 10º":         `${CDN}/CjlCaLhTVwRXVOJY.png`,
  "EASY LED POINT|EASY LED POINT 4X6 26W 48º":         `${CDN}/CjlCaLhTVwRXVOJY.png`,
  "EASY LED POINT|EASY LED POINT 4X6 52W 10º":         `${CDN}/CjlCaLhTVwRXVOJY.png`,
  "EASY LED POINT|EASY LED POINT 4X6 52W 48º":         `${CDN}/CjlCaLhTVwRXVOJY.png`,

  // -- FOCO ------------------------------------------------------------------
  "FOCO|FOCO G RE 13W":           `${CDN}/CmIQfaBdVFoNhpzX.jpg`, // FOCOG
  "FOCO|FOCO G 70L RE 13W 15°":   `${CDN}/TwWYEWNNicaEpsZd.png`, // FOCOG70L
  "FOCO|FOCO G 70L RE 13W 24°":   `${CDN}/TwWYEWNNicaEpsZd.png`,
  "FOCO|FOCO G 70L RE 13W 36°":   `${CDN}/TwWYEWNNicaEpsZd.png`,
  "FOCO|FOCO G 70L RE 13W 60°":   `${CDN}/TwWYEWNNicaEpsZd.png`,
  "FOCO|FOCO G COB 70 RE 13W 15°":`${CDN}/dRuZcAXdpFUVrIhs.jpg`, // FOCOGCOB70
  "FOCO|FOCO G COB 70 RE 13W 24°":`${CDN}/dRuZcAXdpFUVrIhs.jpg`,
  "FOCO|FOCO G COB 70 RE 13W 60°":`${CDN}/dRuZcAXdpFUVrIhs.jpg`,
  "FOCO|FOCO G COB 70 RE 18W 15°":`${CDN}/dRuZcAXdpFUVrIhs.jpg`,
  "FOCO|FOCO G COB 70 RE 18W 24°":`${CDN}/dRuZcAXdpFUVrIhs.jpg`,
  "FOCO|FOCO G COB 70 RE 18W 60°":`${CDN}/dRuZcAXdpFUVrIhs.jpg`,
  "FOCO|FOCO M RE 6.5W":          `${CDN}/nxirrIhbBnWUhFRq.jpg`, // FOCOM
  "FOCO|FOCO M 50L RE 6.5W 24°":  `${CDN}/RzbFfenEhxLnNXkZ.png`, // FOCOM50
  "FOCO|FOCO M 50L RE 6.5W 36°":  `${CDN}/RzbFfenEhxLnNXkZ.png`,
  "FOCO|FOCO P RE 4.5W":          `${CDN}/DsEqoZfIzQnCXIVm.jpg`, // FOCOP
  "FOCO|FOCO P 35L RE 4.5W 24°":  `${CDN}/xjnxcYydJqRbYQkW.jpg`, // FOCOP35L
  "FOCO|FOCO P 35L RE 4.5W 36°":  `${CDN}/xjnxcYydJqRbYQkW.jpg`,

  // -- LUNA ------------------------------------------------------------------
  "LUNA|LUNA PP LED 6,5W RE ABS":  `${CDN}/DClMmmGzfMXRiBGI.png`, // LUNAPP
  "LUNA|LUNA PP LED 13W RE ABS":   `${CDN}/DClMmmGzfMXRiBGI.png`,
  "LUNA|LUNA PP SM 4,5W RE":       `${CDN}/IgmkrvHjvMEjfeHF.png`, // LUNAPPSM
  "LUNA|LUNA PP WW 4,5W RE":       `${CDN}/pHfxLpQvJNrHeopD.png`, // LUNAPPWW
  "LUNA|LUNA P LED 13W RE":        `${CDN}/cSbFZDnehTHsyMRg.png`, // LUNAPRE
  "LUNA|LUNA P SM 6,5W RE":        `${CDN}/WsRVyAQhPXvOZcfL.png`, // LUNAPSM
  "LUNA|LUNA P WW 6,5W RE":        `${CDN}/fKgpExvohjQmJdNI.png`, // LUNAPWW
  "LUNA|LUNA P LED 13W QE":        `${CDN}/EbZegTXDpgaMgIJF.png`, // LUNAPQE
  "LUNA|LUNA G LED 17W RE":        `${CDN}/TvtqljFUSjkhTnRY.png`, // LUNAGRE
  "LUNA|LUNA G LED 26W RE":        `${CDN}/TvtqljFUSjkhTnRY.png`,
  "LUNA|LUNA G LED 22W QE":        `${CDN}/JWzBenSeYZoggcAy.png`, // LUNAGQE
  "LUNA|LUNA GG LED 26W RE":       `${CDN}/pBdzZOCkmVEyXBKS.png`, // LUNAGGRE
  "LUNA|LUNA GG LED 36W RE":       `${CDN}/pBdzZOCkmVEyXBKS.png`,

  // -- LUNA SPOT -------------------------------------------------------------
  "LUNA SPOT|LUNA SPOT 35L 4.5W RE 36°":      `${CDN}/GHpVAmrESsBXpSaE.png`, // LUNASPOT50L (fallback)
  "LUNA SPOT|LUNA SPOT 50L 6.5W RE 24°":      `${CDN}/GHpVAmrESsBXpSaE.png`, // LUNASPOT50L
  "LUNA SPOT|LUNA SPOT 50L 6.5W RE 36°":      `${CDN}/GHpVAmrESsBXpSaE.png`,
  "LUNA SPOT|LUNA SPOT 70L 13W RE 24°":       `${CDN}/FQrJBSyuQXFODpgQ.png`, // LUNASPOT70L
  "LUNA SPOT|LUNA SPOT 70L 13W RE 36°":       `${CDN}/FQrJBSyuQXFODpgQ.png`,
  "LUNA SPOT|LUNA SPOT 70L 13W RE 60°":       `${CDN}/FQrJBSyuQXFODpgQ.png`,
  "LUNA SPOT|LUNA SPOT COB 70 13W RE 10°":    `${CDN}/RvNuIPXCiFjAiUjh.png`, // LUNASPOTCOB70
  "LUNA SPOT|LUNA SPOT COB 70 13W RE 40°":    `${CDN}/RvNuIPXCiFjAiUjh.png`,
  "LUNA SPOT|LUNA SPOT COB 70 18W RE 10°":    `${CDN}/RvNuIPXCiFjAiUjh.png`,
  "LUNA SPOT|LUNA SPOT COB 70 18W RE 40°":    `${CDN}/RvNuIPXCiFjAiUjh.png`,
  "LUNA SPOT|LUNA SPOT COB 70 26W RE 15° ABS":`${CDN}/RvNuIPXCiFjAiUjh.png`,
  "LUNA SPOT|LUNA SPOT COB 70 26W RE 36° ABS":`${CDN}/RvNuIPXCiFjAiUjh.png`,
  "LUNA SPOT|LUNA SPOT COB 70 26W RE 60° ABS":`${CDN}/RvNuIPXCiFjAiUjh.png`,
  "LUNA SPOT|LUNA SPOT COB 111 26W RE 24°":   `${CDN}/PqcuvjMyCQEIIQVJ.png`, // LUNASPOTCOB111
  "LUNA SPOT|LUNA SPOT COB 111 26W RE 36°":   `${CDN}/PqcuvjMyCQEIIQVJ.png`,
  "LUNA SPOT|LUNA SPOT COB 111 26W RE 60°":   `${CDN}/PqcuvjMyCQEIIQVJ.png`,
  "LUNA SPOT|LUNA SPOT COB 111 38W RE 24°":   `${CDN}/PqcuvjMyCQEIIQVJ.png`,
  "LUNA SPOT|LUNA SPOT COB 111 38W RE 36°":   `${CDN}/PqcuvjMyCQEIIQVJ.png`,
  "LUNA SPOT|LUNA SPOT COB 111 38W RE 60°":   `${CDN}/PqcuvjMyCQEIIQVJ.png`,

  // -- MYCRO -----------------------------------------------------------------
  "MYCRO|MYCRO LED 8W RE 20°":    `${CDN}/GmhCckJLRVUkxDKt.png`, // MYCROLED8WRE
  "MYCRO|MYCRO LED 8W RE 60°":    `${CDN}/GmhCckJLRVUkxDKt.png`,

  // -- MYRO ------------------------------------------------------------------
  "MYRO|MYRO G LED 22W RE":       `${CDN}/uvVDUfZORwltqZwJ.png`, // MYROGLED22WRE
  "MYRO|MYRO G LED 22W RNF":      `${CDN}/QOZtcnajUGMMMQYE.png`, // MYROGLED22WRNF
  "MYRO|MYRO G LED 22W QE":       `${CDN}/ZSjGHOpmIDlyfWZv.png`, // MYROGLED22WQE
  "MYRO|MYRO G LED 22W QNF":      `${CDN}/iNVkredwuMZqAedY.png`, // MYROGLED22WQNF
  "MYRO|MYRO P LED 12W RE":       `${CDN}/jtwuciTDtLHdkiBz.png`, // MYROPLED12WRE
  "MYRO|MYRO P LED 12W RNF":      `${CDN}/YUQynTxJviYNEiFK.png`, // MYROPLED12WRNF
  "MYRO|MYRO P LED 12W QE":       `${CDN}/zDfrnkaoMZgMRTHY.png`, // MYROPLED12WQE
  "MYRO|MYRO P LED 12W QNF":      `${CDN}/UKQRmmFCcuNwPLGW.png`, // MYROPLED12WQNF

  // -- ORBITAL ---------------------------------------------------------------
  "ORBITAL|ORBITAL RE LED 50L 6.5W 15°":    `${CDN}/ufuDuePUIuShOisf.png`, // ORBITALRELED50L
  "ORBITAL|ORBITAL RE LED 50L 6.5W 24°":    `${CDN}/ufuDuePUIuShOisf.png`,
  "ORBITAL|ORBITAL RE LED 50L 6.5W 36°":    `${CDN}/ufuDuePUIuShOisf.png`,
  "ORBITAL|ORBITAL RE LED 70L 13W 15°":     `${CDN}/JQFdxrrGuDnXdOkT.png`, // ORBITALRELED70L13W
  "ORBITAL|ORBITAL RE LED 70L 13W 24°":     `${CDN}/JQFdxrrGuDnXdOkT.png`,
  "ORBITAL|ORBITAL RE LED 70L 13W 36°":     `${CDN}/JQFdxrrGuDnXdOkT.png`,
  "ORBITAL|ORBITAL RE LED 70L 13W 60°":     `${CDN}/JQFdxrrGuDnXdOkT.png`,
  "ORBITAL|ORBITAL RE LED COB 70 13W 10°":  `${CDN}/zasJEZYSQIiGhQsR.png`, // ORBITALRELEDCOB7013W
  "ORBITAL|ORBITAL RE LED COB 70 13W 40°":  `${CDN}/zasJEZYSQIiGhQsR.png`,
  "ORBITAL|ORBITAL RE LED COB 70 18W 10°":  `${CDN}/zasJEZYSQIiGhQsR.png`,
  "ORBITAL|ORBITAL RE LED COB 70 18W 40°":  `${CDN}/zasJEZYSQIiGhQsR.png`,
  "ORBITAL|ORBITAL RE LED COB 111 26W 60°": `${CDN}/BzwIdEuCUtjIqOcp.png`, // ORBITALRELEDCOB111
  "ORBITAL|ORBITAL QE LED 50L 6.5W 15°":    `${CDN}/pmZVqHaUXoqryKeG.png`, // ORBITALQELED50L
  "ORBITAL|ORBITAL QE LED 50L 6.5W 24°":    `${CDN}/pmZVqHaUXoqryKeG.png`,
  "ORBITAL|ORBITAL QE LED 50L 6.5W 36°":    `${CDN}/pmZVqHaUXoqryKeG.png`,
  "ORBITAL|ORBITAL QE LED 70L 13W 15°":     `${CDN}/IclWFvpREdElbZKS.png`, // ORBITALQELED70L
  "ORBITAL|ORBITAL QE LED 70L 13W 24°":     `${CDN}/IclWFvpREdElbZKS.png`,
  "ORBITAL|ORBITAL QE LED 70L 13W 36°":     `${CDN}/IclWFvpREdElbZKS.png`,
  "ORBITAL|ORBITAL QE LED 70L 13W 60°":     `${CDN}/IclWFvpREdElbZKS.png`,
  "ORBITAL|ORBITAL QE LED COB 70 13W 10°":  `${CDN}/TyNsLcCZwBPGdbZN.png`, // ORBITALQELEDCOB70
  "ORBITAL|ORBITAL QE LED COB 70 13W 40°":  `${CDN}/TyNsLcCZwBPGdbZN.png`,
  "ORBITAL|ORBITAL QE LED COB 70 18W 10°":  `${CDN}/TyNsLcCZwBPGdbZN.png`,
  "ORBITAL|ORBITAL QE LED COB 70 18W 40°":  `${CDN}/TyNsLcCZwBPGdbZN.png`,
  "ORBITAL|ORBITAL QE LED COB 111 26W 60°": `${CDN}/kEBMieYbhgaVVKko.png`, // ORBITALQELEDCOB111

  // -- ROYAL -----------------------------------------------------------------
  "ROYAL|ROYAL LED 8W RE 15°":    `${CDN}/vjrvwDESMoFbQBbZ.png`, // ROYALLED8WRE
  "ROYAL|ROYAL LED 8W RE 24°":    `${CDN}/vjrvwDESMoFbQBbZ.png`,
  "ROYAL|ROYAL LED 8W RE 36°":    `${CDN}/vjrvwDESMoFbQBbZ.png`,
  "ROYAL|ROYAL LED 8W RE 45°":    `${CDN}/vjrvwDESMoFbQBbZ.png`,
  "ROYAL|ROYAL LED 8W RNF 15°":   `${CDN}/XSHsvMvKaRibwHYn.png`, // ROYALLED8WRNF
  "ROYAL|ROYAL LED 8W RNF 24°":   `${CDN}/XSHsvMvKaRibwHYn.png`,
  "ROYAL|ROYAL LED 8W RNF 36°":   `${CDN}/XSHsvMvKaRibwHYn.png`,
  "ROYAL|ROYAL LED 8W RNF 45°":   `${CDN}/XSHsvMvKaRibwHYn.png`,
  "ROYAL|ROYAL LED 8W QE 15°":    `${CDN}/KjSOfxwoVNnORiLO.png`, // ROYALLED8WQE
  "ROYAL|ROYAL LED 8W QE 24°":    `${CDN}/KjSOfxwoVNnORiLO.png`,
  "ROYAL|ROYAL LED 8W QE 36°":    `${CDN}/KjSOfxwoVNnORiLO.png`,
  "ROYAL|ROYAL LED 8W QE 45°":    `${CDN}/KjSOfxwoVNnORiLO.png`,
  "ROYAL|ROYAL LED 8W QNF 15°":   `${CDN}/bvAgRyJctQPVuMvc.png`, // ROYALLED8WQNF
  "ROYAL|ROYAL LED 8W QNF 24°":   `${CDN}/bvAgRyJctQPVuMvc.png`,
  "ROYAL|ROYAL LED 8W QNF 36°":   `${CDN}/bvAgRyJctQPVuMvc.png`,
  "ROYAL|ROYAL LED 8W QNF 45°":   `${CDN}/bvAgRyJctQPVuMvc.png`,
  "ROYAL|ROYAL LED WW 8W RE":     `${CDN}/tlLwRkRSrFsmmwip.png`, // ROYALLEDWW8WRE

  // -- TORETTO ---------------------------------------------------------------
  "TORETTO|TORETTO RE LED COB 70 13W":  `${CDN}/VUYYWvpTHoLSEpnh.png`,
  "TORETTO|TORETTO RE LED COB 70 18W":  `${CDN}/VUYYWvpTHoLSEpnh.png`,
  "TORETTO|TORETTO RE LED COB 111 26W": `${CDN}/VUYYWvpTHoLSEpnh.png`,

  // -- VENUS -----------------------------------------------------------------
  "VENUS|VENUS P 6,5W 36°":  `${CDN}/XySOMPotYWiSRtzT.jpeg`, // VENUSE
  "VENUS|VENUS M 13W 36°":   `${CDN}/XySOMPotYWiSRtzT.jpeg`,
  "VENUS|VENUS G 18W 36°":   `${CDN}/XySOMPotYWiSRtzT.jpeg`,

  // -- ORIENTE -----------------------------------------------------------------------------------------
  "ORIENTE|ORIENTE CL1 COB 70 18W QNF 15°": "/manus-storage/ORIENTECL1COB7018WQNF_f0011052.png",
  "ORIENTE|ORIENTE CL2 COB 70 18W QNF 15°": "/manus-storage/ORIENTECL2COB7018WQNF_7f897ea9.png",
  "ORIENTE|ORIENTE COB 50 13W QNF 15°":     "/manus-storage/ORIENTECOB5013WRNF_aff18eae.png",
  "ORIENTE|ORIENTE COB 50 13W RE 15°":      "/manus-storage/ORIENTECOB5013WRE_dba86f78.png",
  "ORIENTE|ORIENTE COB 50 13W RNF 15°":     "/manus-storage/ORIENTECOB5013WRNF_aff18eae.png",
  "ORIENTE|ORIENTE WW COB 50 13W RE 15°":   "/manus-storage/ORIENTEWWCOB5013WRE_c0799217.png",

  // -- POLAR --------------------------------------------------------------------------------------
  "POLAR|POLAR 13W RE 15°":  "/manus-storage/POLAR13WRE_2094a5f4.png",
  "POLAR|POLAR 13W RNF 15°": "/manus-storage/POLAR13WRNF_fe253844.png",

  // -- VIRGO --------------------------------------------------------------------------------------
  "VIRGO|VIRGO LED 8W RE 15°":     `${CDN}/dDAJVTaQRCoZKxSS.png`, // VIRGO
  "VIRGO|VIRGO LED 8W RE 24°":     `${CDN}/dDAJVTaQRCoZKxSS.png`,
  "VIRGO|VIRGO LED 8W RE 36°":     `${CDN}/dDAJVTaQRCoZKxSS.png`,
  "VIRGO|VIRGO LED 8W RE 45°":     `${CDN}/dDAJVTaQRCoZKxSS.png`,
  "VIRGO|VIRGO + LED 13W RE 15°":  `${CDN}/XbCuEMBjZfelSbuN.png`, // VIRGO+
  "VIRGO|VIRGO + LED 13W RE 24°":  `${CDN}/XbCuEMBjZfelSbuN.png`,
  "VIRGO|VIRGO + LED 13W RE 36°":  `${CDN}/XbCuEMBjZfelSbuN.png`,
  "VIRGO|VIRGO + LED 13W RE 45°":  `${CDN}/XbCuEMBjZfelSbuN.png`,
};

// --- Painéis: mapeamento por família ----------------------------------------
const PAINEL_PHOTOS: Record<string, string> = {
  // ALE-2462 / ALS-3462
  "ALE-2462":       "/manus-storage/ALE-2462_d6d9664b.png",
  "ALS-3462":       "/manus-storage/ALS-3462_f3f3d475.png",
  // BOX LED E / BOX LED S
  "BOX LED E":      "/manus-storage/BOXLEDE_4b16fa22.png",
  "BOX LED S":      "/manus-storage/BOXLEDS_cc78fede.png",
  // ORBIT
  "ORBIT E":        "/manus-storage/ORBITE_1ff3b0b6.png",
  "ORBIT S":        "/manus-storage/ORBITS_9d32802a.png",
  "ORBIT P":        "/manus-storage/ORBITP_689057a6.png",
  // ALE-2750 / ALS-3750
  "ALE-2750":       "/manus-storage/ALE-2750_5439f635.png",
  "ALS-3750":       "/manus-storage/ALS-3750_a38243df.png",
  // ALE-2420 / ALS-3420
  "ALE-2420":       "/manus-storage/ALE-2420_d1bc931c.jpg",
  "ALS-3420":       "/manus-storage/ALS-3420_26152857.jpg",
  // ALE-2103
  "ALE-2103":       "/manus-storage/ALE-2103_084008ed.jpg",
  // ALE-2118 (várias variações mapeadas por nome do produto)
  "ALE-2118":       "/manus-storage/ALE-2118.2_546216fe.jpg",  // fallback genérico
  // ALE-2140
  "ALE-2140":       "/manus-storage/ALE-2140_a47e62c0.jpg",
  // ALE-2430
  "ALE-2430":       "/manus-storage/ALE-2430_fe793b80.jpg",
  // ALE-2142
  "ALE-2142":       "/manus-storage/ALE-2142_403600ec.jpg",
  // OFFICE COMFORT (mapeado por nome do produto)
  "OFFICE COMFORT": "/manus-storage/OFFICECOMFORT2x332W(618x618mm)_093d2766.png", // fallback genérico
  // PRISMA
  "PRISMA":         "/manus-storage/PRISMA_baa3f305.jpg",
};

// Mapeamento por nome exato do produto (para variações de ALE-2118, ALE-2103 e OFFICE COMFORT)
const PAINEL_PRODUCT_PHOTOS: Record<string, string> = {
  // ALE-2103 RTG tem foto diferente
  "ALE-2103|ALE-2103 36W RTG":                            "/manus-storage/ALE-2103RTG_69d4d79b.jpg",
  // ALE-2118 variações
  "ALE-2118|ALE-2118.2 18W":                              "/manus-storage/ALE-2118.2_546216fe.jpg",
  "ALE-2118|ALE-2118.2 36W":                              "/manus-storage/ALE-2118.2_546216fe.jpg",
  "ALE-2118|ALE-2118.3 26W":                              "/manus-storage/ALE-2118.3_7ff54740.jpg",
  "ALE-2118|ALE-2118.3 36W":                              "/manus-storage/ALE-2118.3_7ff54740.jpg",
  "ALE-2118|ALE-2118.4 36W":                              "/manus-storage/ALE-2118.4_e4c4a8a0.jpg",
  // OFFICE COMFORT variações
  "OFFICE COMFORT|OFFICE COMFORT 2x3 32W (618 x 618mm)": "/manus-storage/OFFICECOMFORT2x332W(618x618mm)_093d2766.png",
  "OFFICE COMFORT|OFFICE COMFORT 2x3 32W (618 x 155mm)": "/manus-storage/OFFICECOMFORT2x332W(618x155mm)_de240468.png",
  "OFFICE COMFORT|OFFICE COMFORT 1x6 32W (1243 x 155mm)": "/manus-storage/OFFICECOMFORT1x632W(1243x155mm)_24d92dab.png",
};

// --- Funções públicas ---------------------------------------------------------

/**
 * Retorna a URL da foto do perfil, ou null se não houver foto cadastrada.
 * Para o SHARP, passa também os difusores D1 e D2 para selecionar a foto correta.
 */
export function getProfilePhoto(
  profileCode: string,
  diffuserD1?: string,
  diffuserD2?: string,
): string | null {
  if (profileCode === "LLP-4451" || profileCode === "LLA-4451") {
    const key = `${profileCode}|${diffuserD1 ?? ""}|${diffuserD2 ?? ""}`;
    return SHARP_PHOTOS[key] ?? null;
  }
  return PROFILE_PHOTOS_SIMPLE[profileCode] ?? null;
}

/**
 * Retorna a URL da foto do Downlight pela família e nome do produto.
 * Tenta primeiro por família+produto, depois retorna null.
 */
export function getDownlightPhoto(
  familia: string,
  produto: string,
): string | null {
  const key = `${familia}|${produto}`;
  return DOWNLIGHT_PRODUCT_PHOTOS[key] ?? null;
}

/**
 * Retorna a URL da foto do Painél pela família e nome do produto.
 * Tenta primeiro por família+produto (para variações), depois por família genérica.
 */
export function getPainelPhoto(
  familia: string,
  produto: string,
): string | null {
  const productKey = `${familia}|${produto}`;
  return PAINEL_PRODUCT_PHOTOS[productKey] ?? PAINEL_PHOTOS[familia] ?? null;
}
