# Catálogo de Condiciones de Pago (Magento a SAP)

Este catálogo documenta la correspondencia exacta entre las cadenas de texto (`condicion`) enviadas desde Magento y el código técnico SAP esperado en el campo `Pmnttrms` de S/4HANA (OData SD01).

Este documento sirve de respaldo conceptual para la clase `PaymentConditionCatalog.cs` implementada en el middleware en C#.

## Muebles América (MA)
- `02 Q MA VAL P INM` -> `02QA`
- `03 M MA P INM` -> `03IA`
- `05 M MA P INM` -> `05IA`
- `05 Q MA VAL P INM` -> `05QA`
- `10 Q MA P INM` -> `10QA`
- `12 M MA P DIF` -> `12DA`
- `12 M MA P INM` -> `12IA`
- `16 Q MA VAL P INM` -> `16QA`
- `18 M MA P DIF` -> `18DA`
- `18 M MA P INM` -> `18IA`
- `24 M MA P DIF` -> `24DA`
- `24 M MA P INM` -> `24IA`
- `120 M MA P DIF` -> `SVDA`
- `120 M MA P INM` -> `SVIA`
- `APARTADO MA` -> `AAEF`
- `APARTADO MA TC P UNI` -> `AAPU`
- `CONTADO MA` -> `ACEF`
- `CONTADO MA TC P UNI` -> `ACPU`
- `TC 03 M MA` -> `AT03`
- `TC 12 M MA` -> `AT12`
- `TC 13 M MA` -> `AT13`
- `TC 15 M MA` -> `AT15`
- `TC 18 M MA` -> `AT18`
- `TC 24 M MA` -> `AT24`

## VIU
- `03 M VIU P INM` -> `03IV`
- `05 M VIU P INM` -> `05IV`
- `12 M VIU P DIF` -> `12DV`
- `12 M VIU P INM` -> `12IV`
- `18 M VIU P DIF` -> `18DV`
- `18 M VIU P INM` -> `18IV`
- `24 M VIU P DIF` -> `24DV`
- `24 M VIU P INM` -> `24IV`
- `120 M VIU P DIF` -> `SVDV`
- `120 M VIU P INM` -> `SVIV`
- `APARTADO VIU` -> `VAEF`
- `APARTADO VIU TC P UNI` -> `VAPU`
- `CONTADO VIU` -> `VCEF`
- `CONTADO VIU TC P UNI` -> `VCPU`
- `TC 03 M VIU` -> `VT03`
- `TC 09 M VIU` -> `VT09`
- `TC 12 M VIU` -> `VT12`

## Institucional / Empleados (INST)
- `02 M INST EMPLEADOS` -> `02IE`
- `03 M INST P INM` -> `03IE`
- `05 M INST P INM` -> `05IE`
- `12 M INST P INM` -> `12IE`
- `18 M INST P INM` -> `18IE`

## Foráneos y Local
- `MAY 01 FORANEO` -> `F01D`
- `MAY 30 FORANEO` -> `F01M`
- `MAY 60 FORANEO` -> `F02M`
- `MAY 90 FORANEO` -> `F03M`
- `MAY 30-90 FORANEO` -> `F03P`
- `MAY 120 FORANEO` -> `F04M`
- `MAY 30-120 FORANEO` -> `F04P`
- `MAY 150 FORANEO` -> `F05M`
- `MAY 30-150 FORANEO` -> `F05P`
- `MAY 08 FORANEO` -> `F08D`
- `MAY 15 FORANEO` -> `F15D`
- `MAY FECHA FORANEO 01 P DIF` -> `FDIF`
- `CONTADO MAY FORANEO` -> `FEFE`
- `CONTADO MAY LOCAL` -> `LEFE`

## Comercial (COM) y Genéricos
- `FACTURACION PPD` -> `000D`
- `COM 030 D` -> `001M`
- `COM 060 D` -> `002M`
- `COM 003 D` -> `003D`
- `COM 090 D` -> `003M`
- `COM 004 D` -> `004D`
- `COM 120 D` -> `004M`
- `COM 005 D` -> `005D`
- `COM 150 D` -> `005M`
- `COM 006 D` -> `006D`
- `COM 007 D` -> `007D`
- `COM 008 D` -> `008D`
- `COM 010 D` -> `010D`
- `COM 012 D` -> `012D`
- `COM 013 D` -> `013D`
- `COM 014 D` -> `014D`
- `COM 015 D` -> `015D`
- `COM 018 D` -> `018D`
- `COM 020 D` -> `020D`
- `COM 021 D` -> `021D`
- `COM 022 D` -> `022D`
- `COM 028 D` -> `028D`
- `COM 040 D` -> `040D`
- `COM 045 D` -> `045D`
- `COM 055 D` -> `055D`
- `COM 070 D` -> `070D`
- `COM 075 D` -> `075D`
- `COM 100 D` -> `100D`
- `COM 105 D` -> `105D`
- `COM 117 D` -> `117D`
- `COM 130 D` -> `130D`
- `COM 140 D` -> `140D`
- `02 M` -> `0M02`
- `03 M` -> `0M03`
- `04 M` -> `0M04`
- `05 M` -> `0M05`
- `06 M` -> `0M06`
- `08 M` -> `0M08`
- `10 M` -> `0M10`
- `CONT` -> `CONT`
