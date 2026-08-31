# Catálogo TheMembers — Projeto Cirurgião (plataforma 5242)

> Snapshot da estrutura de conteúdo hospedada na TheMembers, capturado em **2026-08-30**.
> Fonte da verdade para montar as **vitrines** na nossa plataforma. Dados brutos: `themembers-catalog.json`.

**Totais:** 7 cursos · 61 módulos · 1116 aulas.

## API TheMembers (para futuros agentes)

Base: `https://api.themembers.com.br` · headers: `Authorization: Bearer <jwt>` + `x-tenant-id: 5242`.

| Recurso | Endpoint |
|---|---|
| Login | `POST /api/auth/login` body `{email, password, tenant_id:"5242"}` → `access_token` (bearer, 7d) |
| Cursos | `GET /api/auth/cursos/index/5242` |
| Módulos de um curso | `GET /api/auth/cursos/get/modules/5242/{courseId}` → `{modules:[...]}` |
| Aulas de um módulo | `GET /api/auth/cursos/get/lessons/5242/{moduleId}` → `{lessons:[...]}` |
| Detalhes do curso | `GET /api/auth/cursos/get-course-details/5242/{courseId}` |

## Resumo dos cursos

| # | Curso | Módulos | Aulas | Publicado | Slug |
|---|---|---|---|---|---|
| 1 | Cirurgia Na Prática | 3 | 429 | ✅ | `cirurgia-na-pratica` |
| 2 | Treinamentos Premium | 12 | 90 | ✅ | `treinamentos-premium1167013426` |
| 3 | Aprofundamento Tecidos Moles | 15 | 293 | ✅ | `aprofundamento-tecidos-moles` |
| 4 | O Veterinário de Valor | 16 | 70 | ✅ | `o-veterinario-de-valor` |
| 5 | E-books | 3 | 3 | ✅ | `e-books1976902248` |
| 6 | Aprofundamento Ortopedia | 4 | 39 | ✅ | `aprofundamento-ortopedia` |
| 7 | Treinamentos | Pós graduação | 8 | 192 | ✅ | `treinamentos-pos-graduacao2080353611` |

## Estrutura detalhada

### Cirurgia Na Prática

- **ID:** `63e1effa-d042-4dbe-bfe3-2925a0f5347c`
- **Slug:** `cirurgia-na-pratica` · **Publicado:** sim · **Módulos:** 3 · **Aulas:** 429

<details>
<summary><b>0. Tecidos Moles Na Prática</b> — 225 aulas</summary>

Módulo `29315aee-f76d-4576-8aa2-ef18be00b157`

1. Boas vindas
2. Lobectomia pulmonar - caso 2
3. Tireoidectomia - caso 2
4. Esplenectomia - caso 4
5. Ovário-histerectomia (terapêutica) - caso 18
6. Cistotomia - caso 5
7. Ovário-histerectomia (Ovário remanescente + Piometra de coto uterino) - caso 19
8. Exérese neoplasia cutânea
9. Cesariana (cadela)
10. Prolapso de uretra - caso 2
11. Rânula
12. Amputação de membro torácico (deixando a escápula) - caso 1
13. Enterotomia - caso 1
14. Herniorrafia escrotal
15. Stent Intratraqueal
16. Cistotomia - caso 4
17. Ovário-histerectomia (morte fetal) - caso 17
18. Enterotomia (felino) - caso 2
19. Cistotomia (em cadela) - caso 3
20. Orquiectomia (canino) - caso 8
21. Ovário-histerectomia (morte fetal) - caso 16
22. Otohematoma correção
23. Esplenectomia - caso 3
24. Orquiectomia (canino) - caso 7
25. Ovário-histerectomia - caso 15
26. Vasectomia (canino)
27. Ovário-histerectomia (piometra) - caso 14
28. Ovário-histerectomia (hemometra) - caso 13
29. Ovário-histerectomia - caso 12
30. Ureter ectópico
31. Penectomia + uretrostomia em cão - caso 2
32. Gastrotomia - caso 1
33. Toracocentese
34. Cistotomia (em felina) - caso 2
35. Gastrotomia - caso 1
36. Esplenectomia + Ovário-histerectomia
37. Sepultamento da glândula da terceira pálpebra
38. Orquiectomia (criptorquida) - caso 5
39. Uretrostomia perineal em felino (reoperação) - caso 5
40. Uretrostomia escrotal - caso 1
41. Faringostomia
42. Vulvoplastia
43. Orquiectomia - caso 6
44. Ovário-histerectomia (com gancho) - caso 11
45. Prostatectomia
46. Ovário histerectomia - caso 10
47. Uretrostomia pré escrotal - caso 1
48. Inserção de dreno torácico
49. Biopsia pâncreas, intestino e linfonodo (gato)
50. Ruptura diafragmática - caso 2
51. Glossectomia
52. Nefrectomia - caso 4
53. Ovário-histerectomia (bisturi ultrassônico) - caso 7
54. Ovário-histerectomia (Piometra) - caso 6
55. Orquiectomia (felino) - caso 3
56. Cistectomia total + Transposição ureter na pele (cadela)
57. Orquiectomia (felino) - caso 4
58. Ovário-histerectomia (felino) - caso 8
59. Ovário-histerectomia - caso 9
60. Uretrostomia transpélvica
61. Herniorrafia perineal - caso 3
62. Colecistoduodenostomia - caso 1
63. Enterectomia - caso 1
64. Cistotomia (em macho) - caso 1
65. Ruptura diafragmática - caso 1
66. Torção vólvulo gástrica
67. Ovário-histerectomia + Mastectomia - caso 1
68. Neoplasia ovariana
69. Nefrectomia - caso 1
70. Laparotomia exploratória (Lobectomia hepática total + lobectomia hepática parcial + esplenectomia)
71. Excisão da glândula adanal
72. Estafilectomia com bisturi ultrassônico
73. Colectomia subtotal
74. Abscesso prostático
75. Colecistoduodenostomia - caso 2
76. Laceração De Cartilagem Cricoide
77. Ressecção de reto em gato
78. Ablação de conduto auditivo - caso 1
79. Ablação de conduto auditivo - caso 2
80. Flap Da Artéria Torácica Lateral
81. Herniorrafia inguinal - caso 1
82. Herniorrafia perineal - caso 1
83. Laparotomia Exploratória
84. Laparotomia Exploratória - Abcesso Hepático
85. Mastectomia - caso 1
86. Mastectomia (Sutura contínua na pele) - caso 2
87. Nefrectomia - caso 2
88. Orquiectomia - caso 1
89. Persistência Do 4 Arco Aórtico Direito
90. Pólipo Em Bexiga
91. Uretrostomia em felino (Reoperação) - caso 6
92. Correção de eventração
93. Fenda Palatina
94. Mastectomia (Bilateral parcial) - caso 3
95. Prolapso de uretra - caso 1
96. Uretrostomia perineal em felino - caso 1
97. Herniorrafia perineal - caso 2
98. Ovário-histerectomia - caso 1
99. Ovário-histerectomia - caso 2
100. Ovário-histerectomia - caso 3
101. Ovário-histerectomia - caso 4
102. Ovário-histerectomia - caso 5
103. Neoureteroanastomose cutânea
104. Ablação de conduto auditivo (em felino) - caso 3
105. Adrenalectomia
106. Colecistoduodenostomia - caso 4
107. Cricoaritenoidectomia
108. Enterectomia - caso 2
109. Exérese de neoplasia (Lipoma gigante)
110. Fístula oronasal
111. Gastrectomia parcial
112. Hérnia peritônio pericárdica
113. Herniorrafia perineal - caso 4
114. Intussuscepção
115. Laparotomia exploratória - abscesso em pedículo ovariano
116. Laparotomia exploratória (úlcera gástrica)
117. Laparotomia exploratória - Enterectomia
118. Lobectomia hepática - caso 1
119. Lobectomia hepática - caso 2
120. Lobectomia hepática (parcial) - caso 3
121. Lobectomia pulmonar - caso 1
122. Nefrectomia - caso 3
123. Orquiectomia - caso 2
124. Ovariectomia
125. Ovário-histerectomia + Mastectomia - caso 2
126. Ovários remanescentes
127. Penectomia + uretrostomia em cão - caso 1
128. Persistência do ducto arterioso - PDA
129. Prolápso da glândula da terceira pálpebra
130. Ressecção de piloro - Billroth 1
131. Ressecção de reto em cão
132. Retalho subdémico rotacional da prega inguinal
133. Rinoplastia
134. Sonda esofágica
135. Testículo ectópico
136. Tireoidectomia
137. Trepanação de seio nasal
138. Ureter x  Pedículo ovariano (demonstração em cadáver)
139. Uretrostomia perineal em felino - caso 2
140. Uretrostomia perineal em felino - caso 3
141. Colecistoduodenostomia - caso 3
142. Cistectomia parcial
143. Uretrostomia perineal em felino - caso 4
144. Ovário-histerectomia (eletiva) - caso 20
145. Ovário-histerectomia - caso 21
146. Colecistoduodenostomia - caso 5
147. Orquiectomia (canino) - caso 10
148. Orquiectomia (felino) - caso 11
149. Amputação de membro torácico (removendo a escápula) - caso 2
150. Gastrotomia - caso 2
151. Amputação Dígitos - caso 1
152. Amputação de membro pélvico (cão) - caso 1
153. Amputação de membro torácico (removendo a escápula) - caso 3
154. Amputação de membro pélvico (gato) - caso 2
155. Amputação de membro pélvico (cão) - caso 3
156. Amputação de membro torácico (escapulec) - caso 4
157. Amputação de metatarsianos
158. Biópsia intestinal
159. Biópsia de linfonodos mesentéricos
160. Biópsia óssea (tíbia distal)
161. Biópsia óssea (fêmur proximal)
162. Biópsia pancreática (laser)
163. Caudectomia (cão) - caso 2
164. Cistectomia parcial + Eletroquimioterapia
165. Cistotomia (complexa) - caso 6
166. Cistotomia - caso 7
167. Colecistectomia - caso 1
168. Corpo estranho linear
169. Correção de eventração (traumática) - caso 2
170. Criptorquidismo em gato (orquiectomia)
171. Colectomia subtotal - caso 2
172. Laparotomia exploratória - aderência em pedículo
173. Enterectomia + Biópsia linfonodo mesentérico (gato) - caso 3
174. Enterotomia (corpo estranho) - caso 3
175. Esplenectomia - caso 5
176. Esplenectomia com bisturi ultrassônico - caso 7
177. Esplenectomia - caso 6
178. Excisão de glândula submandibular (sialoadenectomia)
179. Excisão neoplasia adanal
180. Herniorrafia perineal - caso 5
181. Flap da artéria auricular caudal
182. Laparotomia exploratória - neoplasia ovariana
183. Laparotomia exploratória - biópsia intestinal
184. Linfadenectomia submandibular
185. Lobectomia hepática direita (acesso acessório) - caso 4
186. Mandibulectomia rostral (fratura patológica)
187. Enucleação - caso 1
188. Lobectomia hepática (paliativa) - caso 5
189. Mandibulectomia rostral (fratura patológica)
190. Mastectomia (bilateral total) - caso 4
191. Mastectomia (unilateral total) + OSH - caso 5
192. Maxilectomia (parcial) - caso 1
193. Maxilectomia - caso 2
194. Nefrectomia (cão) - caso 5
195. Nefrectomia (gato) - caso 6
196. Nefrectomia (pós duplo J em gato) - caso 7
197. Neoplasia de prepúcio (reconstrução)
198. Nodulectomia + Flap de avanço
199. Nosectomia + Eletroquimioterapia - caso 1
200. Nosectomia - caso 2
201. Nodulectomia + Flap de avanço
202. Ovariectomia - caso 2
203. Ovário remanescente - caso 2
204. Ovário-histerectomia (eletiva) - caso 22
205. Pancreatectomia parcial - caso 1
206. Persistência do ducto arterioso (PDA) - caso 2
207. Uretrostomia perineal (Penectomia) em felino - caso 7
208. Ovário-histerectomia (piometra) - caso 23
209. Ovário-histerectomia (Piometra felino) - caso 24
210. Sepultamento da glândula da terceira pálpebra - caso 3
211. Sepultamento da glândula da terceira pálpebra - caso 4
212. Shunt gastrocaval
213. Fenda palatina - caso 2
214. Tireoidectomia (cão) - caso 3
215. Torção vólvulo gástrica - caso 2
216. Transposição de ureter - Duplo J
217. Uretrostomia transpélvica - caso 2
218. Conchectomia - caso 1
219. Ovário-histerectomia (bisturi ultrassônico) - caso 25
220. Excisão de glândula submandibular (sialoadenectomia) - caso 2
221. Cistotomia + Ureterotomia bilateral (felino)
222. Disjunção da sínfise mandibular
223. Lobectomia hepática com laser + Esplenectomia com bisturi ultrassônico
224. PROLAPSO DE ÚTERO E PROLAPSO-HIPERPLASIA VAGINAL
225. PROLAPSO DE RETO

</details>

<details>
<summary><b>1. Ortopedia Na Prática</b> — 167 aulas</summary>

Módulo `00b9e523-d949-4766-b420-4ccf04960d8c`

1. Boas vindas
2. CTWO modificada
3. TPLO - caso 14
4. Osteossíntese de mandíbula - caso 9
5. Osteossíntese de ílio - caso 6
6. Osteossíntese de mandíbula (bilateral) - caso 8
7. Estabilização de luxação de ombro
8. TPLO-Modificada - caso 13
9. TPLO - caso 12
10. Osteossíntese de mandíbula (felino) - caso 7
11. Osteossíntese de ílio - caso 5
12. Osteossíntese de fêmur - caso 18
13. Luxação de patela (Trocleoplastia + TTT) - caso 3
14. TPLO-Modificada - caso 11
15. TPLO - caso 10
16. Remoção de implante (placa TPLO)
17. Osteossíntese de fêmur - caso 16
18. Biópsia óssea (tíbia proximal) - caso 2
19. Artrodese tibiotársica
20. Osteossíntese de rádio e ulna (Fixador Ilizarov) - caso 13
21. TPLO - caso 8
22. Ostessíntese de fêmur (felino) - caso 15
23. Osteossíntese de tíbia (felino) - caso 11
24. Osteossíntese de rádio e ulna - caso 12
25. Remoção de fixador externo
26. Osteossíntese de fêmur - caso 13
27. Ressecção de cabeça e colo femoral - caso 6
28. Ostessíntese de fêmur (felino) - caso 14
29. Osteossíntese de tíbia (felino) - caso 3
30. Osteossíntese de tíbia - caso 4
31. Osteossíntese de rádio e ulna (toy) - caso 7
32. Osteossíntese de tíbia - caso 5
33. Osteossíntese de tíbia - caso 6
34. Osteossíntese de tíbia (filhote) - caso 8
35. Osteossíntese de calcâneo (felino)
36. Avulsão de trocânter maior + Fratura de colo femoral (felino)
37. Osteossíntese de úmero (distal) - caso 5
38. Osteossíntese de mandíbula (Prof Kadu) - caso 6
39. Osteossíntese de rádio e ulna (felino) - caso 11
40. Biópsia óssea  (tíbia proximal)
41. Osteossíntese de tíbia - caso 1
42. Disjunção sacroilíaca - caso 1
43. Osteossíntese de metacarpos - caso 1
44. Osteossíntese de fêmur - caso 1
45. Osteossíntese de ílio - caso 1
46. Sutura fabelotibial - Caso 1
47. TPLO - caso 1
48. Osteossíntese de fêmur - caso 2
49. Osteossíntese de fêmur (haste intramedular) - caso 3
50. Osteossíntese de tíbia (MIPO = Osteossíntese Minimamente Invasiva com Placa) - caso 2
51. Sutura fabelotibial - Caso 2
52. TPLO (mini) - caso 2
53. Ressecção de cabeça e colo femoral - caso 1
54. Osteossíntese de fêmur (Salter Harris Tipo 1) - caso 4
55. Osteossíntese de rádio e ulna (toy) - caso 1
56. Osteossíntese de olécrano
57. Osteossíntese de mandíbula (rostral) - caso 1
58. Ressecção de cabeça e colo femoral - caso 2
59. Osteossíntese de fêmur - caso 5
60. Osteossíntese de Rádio e Ulna - caso 2
61. Menisectomia Medial
62. Caudectomia (Felino) - caso 1
63. Fixador Esquelético Externo Como Contensão De Danos Em Articulação Tibiotarsica
64. Osteossíntese de Rádio e ulna - caso 3
65. Ressecção de cabeça e colo femoral (Necrose asséptica) - caso 3
66. Biópsia Óssea
67. Osteossíntese de ílio - caso 2
68. Osteossíntese de fêmur (felino jovem) - caso 6
69. Osteocondrite Dissecante Da Cabeça Umeral
70. Avulsão da crista tibial - caso 1
71. Avulsão do ligamento patelar
72. Osteossíntese De Escápula
73. Osteossíntese de úmero (distal) - caso 2
74. Avulsão do trocanter maior do fêmur
75. Osteossíntese de fêmur - caso 7
76. Disjunção Sacroilíaca - caso 3
77. Osteossíntese de mandíbula (bilateral) + disjunção de sínfise mentoniana - caso 2
78. Osteossíntese de fêmur - caso 10
79. Ressecção de cabeça e colo femoral - caso 5
80. Osteossíntese de tíbia (MIPO) - caso 10
81. Ostesossíntese de fêmur (distal) - caso 12
82. Osteossíntese de ílio - caso 4
83. Artrodese tarsometatársica - caso 1
84. Artrodese tarsometatársica - caso 2
85. Avulsão da crista tibial - caso 2
86. Avulsão da crista tibial - caso 3
87. Avulsão da crista tibial - caso 4
88. Disjunção sacroilíaca - caso 2
89. Disjunção sacroilíaca bilateral + Luxação coxofemoral
90. Estabilização de luxação de cotovelo - caso 1
91. Estabilização de luxação de cotovelo - caso 2
92. Luxação de patela (TTTT + Trocleoplastia + Imbricação do retináculo) - caso 1
93. Osteossíntese de fêmur (haste intramedular) - caso 9
94. Osteossíntese de ílio - caso 3
95. Osteossíntese de Ílio + Tíbia
96. Osteossíntese de mandíbula - caso 4
97. Osteossíntese de metatarsos - caso 1
98. Osteossíntese de rádio e ulna - caso 4
99. Osteossíntese de rádio e ulna - caso 5
100. Osteossíntese de rádio e ulna - caso 6
101. Osteossíntese de tíbia (FEE + Placa) - caso 7
102. Osteossíntese de rádio e ulna (toy) - caso 8
103. Osteossíntese de tíbia (usando distrator) - caso 9
104. Osteossíntese de úmero (felino) - caso 3
105. Politrauma (Ressecção de cabeça e colo femoral + Osteossíntese de fêmur + Osteossíntese de tíbia)
106. Reoperação de osteossíntese de corpo de ílio
107. Sutura íliofemoral - caso 1
108. TPLO - caso 3
109. TPLO - caso 4
110. TPLO - caso 5
111. TPLO (felino) - caso 6
112. Disjunção sacroilíaca - caso 3
113. Osteossíntese de mandíbula (faringotomia) - caso 3
114. Ressecção de cabeça e colo femoral - caso 4
115. Osteossíntese de rádio e ulna (toy) - caso 9
116. Osteossíntese de rádio e ulna (toy) - caso 10
117. Luxação de patela (TTTT + Imbricação do retináculo) - caso 2
118. TPLO - caso 7
119. CTWO modificada
120. Estabilização de luxação escápulo-umeral medial - caso 2
121. Osteossíntese de fêmur distal (pino cruzado) gato - caso 20
122. Osteossíntese de fêmur - caso 21
123. Sutura de Kessler modificada (Locking loop)
124. TPLO mini Duplo Corte - caso 15
125. TPLO mini modificada - caso 16
126. Osteossíntese de rádio e ulna (MIPO) - caso 15
127. Osteossíntese de rádio e ulna - caso 16
128. Osteossíntese de rádio e ulna - caso 17
129. Osteossíntese de rádio e ulna (gato) - caso 18
130. Osteossíntese de rádio e ulna - caso 19
131. Osteossíntese de rádio e ulna - caso 20
132. Osteossíntese de úmero (distal) - caso 7
133. Osteossíntese de úmero (diáfise) - caso 8
134. Osteossíntese de fêmur (proximal) - caso 22
135. TPLO - caso 19
136. TPLO (sangramento poplítea) - caso 21
137. TPLO mini (placa Toride 2.0) - caso 18
138. Osteossíntese de ílio - caso 7
139. Osteossíntese de ílio - caso 8
140. Osteossíntese de mandíbula (com placa) - caso 10
141. Osteossíntese de mandíbula (com placa) - caso 11
142. Osteossíntese de tíbia - caso 13
143. Osteotomia corretiva distal de fêmur
144. Ressecção de cabeça e colo femoral (colocefalec) - caso 7
145. Sutura fabelotibial - caso 3
146. Sutura fabelotibial - caso 4
147. Sutura íliofemoral - caso 2
148. Transposição da fáscia lata
149. Luxação de patela (Trocleoplastia + TTT) - caso 4
150. Sutura fabelotibial - caso 3
151. Osteossíntese de úmero (distal) - caso 6
152. Correção de deformidade angular em membro torácico
153. TPLO - caso 9
154. Osteossíntese de fêmur - caso 17
155. Artrodese de cotovelo
156. Osteossíntese de tíbia - caso 12
157. Osteossíntese de úmero (distal) - caso 4
158. Osteossíntese de úmero (distal) - caso 1
159. Hemimandibulectomia
160. Osteossíntese de mandíbula - caso 5
161. Osteossíntese de fêmur - caso 8
162. Osteossíntese de fêmur - caso 11
163. Osteossíntese de fêmur - caso 19
164. Osteossíntese de rádio e ulna - caso 14
165. TPLO mini (placa Toride 1.5) - caso 17
166. TPLO (placa toride 3.5) - caso 20
167. Osteossíntese distal de tíbia (felino) - caso 14

</details>

<details>
<summary><b>2. Neurocirurgia Na Prática</b> — 37 aulas</summary>

Módulo `a882f8f2-6280-4854-a302-53bff601a4eb`

1. Boas vindas
2. Hemilaminectomia (Tobias) - caso 5
3. Descompressão vertebral (Fratura de C-2)
4. Pediculectomia (L2-L3) - caso 3
5. Pediculectomia (T12-T13) - caso 2
6. Pediculectomia T11-T12
7. Remoção de implante em vértebra L6
8. Estabilização vertebral (fratura L1 em felino) - caso 8
9. Slot ventral - caso 2
10. Slot ventral - caso 1
11. Hemilaminectomia - caso 4
12. Estabilização vertebral (luxação toracolombar) - caso 1
13. Estabilização vertebral (luxação cervical) - caso 2
14. Estabilização vertebral (poliaxiais 4,5mm) - caso 3
15. Estabilização atlantoaxial
16. Estabilização vertebral (fratura L5) - caso 5
17. Estabilização vertebral (fratura L6) - caso 7
18. Estabilização vertebral (luxação toracolombar) - caso 4
19. Hemilaminectomia - caso 1
20. Hemilaminectomia - caso 2
21. Hemilaminectomia - caso 3
22. Estabilização vertebral (fratura L3) - caso 6
23. Estabilização vertebral (L3-4-5) - caso 12
24. Estabilização vertebral (L6-7) - caso 14
25. Hemilaminectomia (L4-5) - caso 7
26. Hemilaminectomia (T12-13-L1) - caso 8
27. Hemilaminectomia (T12-13) - caso 9
28. Slot ventral (C5-C6) - caso 3
29. Estabilização vertebral (Fratura L6) - caso 11
30. Estabilização vertebral (fratura L7) - caso 10
31. Hemilaminectomia T12-T13-L1 - caso 6
32. Estabilização vertebral (luxação L2-L3) - caso 9
33. Descompressão e estabilização de hemivértebra torácica (canino)
34. Estabilização atlantoaxial - caso 2
35. Estabilização vertebral (L5-6-7) - caso 13
36. Laminectomia (C1-2) - caso 1
37. Laminectomia (T11-L2) - caso 2

</details>

### Treinamentos Premium

- **ID:** `8c683758-ada1-431d-ae19-30da9c4d1665`
- **Slug:** `treinamentos-premium1167013426` · **Publicado:** sim · **Módulos:** 12 · **Aulas:** 90

<details>
<summary><b>0. Castração Descomplicada - Gravado</b> — 20 aulas</summary>

Módulo `34590409-0620-4784-9de9-1a26a7fe8373`

1. Introdução
2. Jornada do cliente
3. Como vender a cirurgia de castração + Como se reguardar juridicamente
4. Acesso a cavidade abdominal
5. Ovário-histerectomia(cadela) - cadáver
6. Ovário-histerectomia - caso 9
7. Ovário-histerectomia (felino) - caso 8
8. Ureter x Pedículo ovariano 2 (cadáver)
9. Ligamento suspensor do ovário
10. Ligamento suspensor do ovário (romper)
11. Abrindo a bursa
12. Ureter x Pedículo ovariano (demonstração em cadáver)
13. Obrigatoriamente a fáscia muscular deve ser incorporada a celiorrafia!
14. Orquiectomia (felino) - cadáver
15. Orquiectomia (felino) - caso 4
16. Orquiectomia (cão) - cadáver
17. Orquiectomia - caso 2
18. Escada do Sucesso
19. Pós-operatório de sucesso + Encantamento do cliente
20. O próximo passo!

</details>

<details>
<summary><b>1. Como se tornar um cirurgião volante</b> — 6 aulas</summary>

Módulo `4ef383d1-54c4-4d14-b8e6-1769490d42aa`

1. 1 - O que é ser um cirurgião volante
2. 2 - Quero ser um cirurgião volante
3. 3 - Como se inserir no mercado
4. 4 - Vixi, deu complicação. Como lidar?
5. 5 - Preço X Valor
6. 6 - O próximo passo!

</details>

<details>
<summary><b>2. Cistotomia Descomplicada</b> — 8 aulas</summary>

Módulo `53a28f63-ea23-4371-8091-f1499f75cbe1`

1. 1 - Introdução
2. 2 - Jornada do cliente
3. 3 - Vendas
4. 4 - Cistotomia em cadáver
5. 5 - Cistotomia em paciente vivo (canino, macho)
6. 6 - Escada do Sucesso
7. 7 - Pós operatório de sucesso + Encantamento do cliente
8. 8 - O próximo passo!

</details>

<details>
<summary><b>3. Uretrostomia Perineal em Felinos Descomplicada</b> — 9 aulas</summary>

Módulo `59140fb0-c102-4061-92fa-6bcddb825b3d`

1. 1 - Introdução
2. 2 - Jornada do cliente
3. 3- Vendas
4. 4 - Uretrostomia Perineal no Felino (cadáver)
5. 5 - Uretrostomia Perineal no Felino (paciente vivo) - caso 1
6. 6 - Uretrostomia Perineal no Felino (paciente vivo) - caso 2
7. 7 - Escada do Sucesso
8. 8 - Pós operatório de sucesso + Encantamento do cliente
9. 9 - O próximo passo!

</details>

<details>
<summary><b>4. Ruptura Diafragmática Descomplicada</b> — 10 aulas</summary>

Módulo `6419bcae-1d36-4b97-b4db-29b6b7cc5e1f`

1. 1 - Introdução
2. 2 - Jornada do cliente
3. 3 - Vendas
4. 4 - Abordagem teórica da ruptura diafragmática
5. 5 - Correção da ruptura diafragmática em cadáver
6. 6 - Correção da ruptura diafragmática em paciente vivo - caso 1
7. 7 - Correção da ruptura diafragmática em paciente vivo - caso 2
8. 8 - Escada do Sucesso
9. 9 - Pós operatório de sucesso + Encantamento do cliente
10. 10 - O próximo passo!

</details>

<details>
<summary><b>5. Mastectomia Descomplicada</b> — 10 aulas</summary>

Módulo `2c5993b6-d850-4ef9-9d93-3918ecdb5a30`

1. 1 - Introdução
2. 2 - Jornada do cliente
3. 3 - Vendas
4. 4 - Mastectomia SEM tensão - demonstração em cadáver
5. 5 - Ovário-histerectomia + Mastectomia em paciente vivo
6. 6 - Mastectomia em paciente vivo
7. 7 - Mastectomia (Sutura contínua na pele) em paciente vivo
8. 8 - Escada do Sucesso
9. 9 - Pós operatório de sucesso + Encantamento do cliente
10. 10 - O próximo passo!

</details>

<details>
<summary><b>6. Direcionamento para Residência</b> — 2 aulas</summary>

Módulo `dc600738-8603-4738-9569-f15fea90fdf4`

1. Aula
2. O próximo passo!

</details>

<details>
<summary><b>7. Manual de Suturas</b> — 23 aulas</summary>

Módulo `9dbb7c83-b82e-4f8e-b4e3-b1557260203e`

1. Introdução
2. Lambert
3. Donatti
4. Halsted
5. Sutura de Tendão
6. Simples separado
7. Sutura em Bolsa de Fumo
8. Sutura em U Contínua
9. SUTURA EM X ou SULTAN
10. SUTURA PARA FIXAÇÃO DE TUBO
11. Nó de Cirurgião
12. Nó de Miller
13. Tricotomia e antissepsia
14. Sutura ponto simples separado
15. Ponto em X
16. Ponto em U
17. Sutura simples contínua
18. Sutura invaginante
19. Sutura bailarina
20. Sutura bolsa de fumo
21. Sutura intradermica
22. Sutura festonada
23. O próximo passo!

</details>

<details>
<summary><b>8. Paciente oncológico: como conduzi-lo de maneira clínico cirúrgica</b> — 2 aulas</summary>

Módulo `16cd5c2d-3b97-4c7a-8aca-3c99c5a5c21f`

1. Paciente oncológico: como conduzi-lo de maneira clínico cirúrgica.
2. O próximo passo!

</details>

<details>
<summary><b>9. Castração Descomplicada - Turma 2</b> — 0 aulas</summary>

Módulo `eb07da16-cae1-47d6-aaf4-7ed2644a28ba`


</details>

<details>
<summary><b>10. Castração Descomplicada - Turma 1</b> — 0 aulas</summary>

Módulo `4a09e59d-bc43-4030-98d3-fc09398f6464`


</details>

<details>
<summary><b>11. Encontros semanais ao vivo</b> — 0 aulas</summary>

Módulo `f6f8345f-d0b5-4c1c-b523-ae1b4cbdb925`


</details>

### Aprofundamento Tecidos Moles

- **ID:** `bcc9385f-6e89-48ec-bcb5-2b83b1ca3093`
- **Slug:** `aprofundamento-tecidos-moles` · **Publicado:** sim · **Módulos:** 15 · **Aulas:** 293

<details>
<summary><b>0. Top 10 cirurgias da rotina</b> — 51 aulas</summary>

Módulo `c3f8dde1-fe31-4f9c-bdd7-83c11358b35f`

1. 1 Introdução
2. 2 Conhecendo seu mentor
3. 4 Orquiectomia
4. 3 Materiais e instrumentais
5. 7 Nefrectomia
6. 5 Esplenectomia
7. 6 Cistotomia
8. 8 Gastrotomia
9. 9 Ovariohisterectomia (castração)
10. 10 Enterotomia
11. 11 Enterectomia
12. 12 Ruptura Diafragmatica
13. 13 Mastectomia
14. 14 O proximo passo
15. Tricotomia e antissepsia
16. Sutura ponto simples separado
17. Ponto em X
18. Sutura em U
19. Sutura simples contínua
20. Sutura festonada
21. Sutura invaginante
22. Sutura bailarina
23. Sutura bolsa de fumo
24. Sutura intradermica
25. Orquiectomia
26. Acesso à cavidade abdominal
27. BÔNUS: Teoria da torção gastrica
28. Esplenectomia
29. Cistotomia
30. Nefrectomia
31. Gastrotomia
32. Sutura no intestino
33. Anatomia intestino
34. Enterotomia
35. Enterectomia
36. Enteroanastomose com diâmetros desiguais
37. Correção da ruptura diafragmática
38. Mastectomia
39. Fechamento da cavidade abdominal
40. O próximo passo!
41. Gastrotomia - caso 1
42. Oquiectomia - caso 2
43. Esplenectomia - caso 5
44. Cistotomia (canino, macho)
45. Nefrectomia - caso 3
46. Ovário-histerectomia - caso 9
47. Enterotomia - caso 1
48. Enterectomia - caso 1
49. Mastectomia - caso 1
50. Ruptura diafragmática - caso 1
51. O próximo passo!

</details>

<details>
<summary><b>1. Linfadenectomias</b> — 9 aulas</summary>

Módulo `1697a049-79ba-4a36-96e5-19286d208c25`

1. Linfadenectomia axilar (com azul patente)
2. Linfadenectomia axilar (sem azul patente)
3. Linfadenectomia mandibular / submandibular (sem azul patente e decúbito lateral)
4. Linfadenectomia mandibular / submandibular (com azul patente e decúbito dorsal)
5. Linfadenectomia retrofaríngeo
6. Linfadenectomia inguinal
7. Linfanectomia poplíteo
8. BÔNUS: Demonstração prática da eletroquimioterapia
9. BÔNUS: Demonstração aparelho de eletroquimioterapia

</details>

<details>
<summary><b>2. Amputações</b> — 5 aulas</summary>

Módulo `995e870b-7c3a-4985-ac84-8a2cc4ead6cf`

1. Amputação de cauda (caudectomia)
2. Amputação de Dígito
3. Amputação de Membro Pélvico (ARQUIVO COMPLETO NÃO COUBE DEVE SUBSTITUIR APÓS LIBERAÇÃO DO SITE)
4. Amputação de Membro Torácico (Deixando a escápula)
5. Amputação de Membro Torácico (Removendo a escápula)

</details>

<details>
<summary><b>3. Anatomia aplicada à cirurgia de tecidos moles</b> — 48 aulas</summary>

Módulo `9e458238-b38d-49ad-a014-e9abb735a9b1`

1. Introdução
2. Planos e eixos
3. Anatomia abdominal
4. Peritônio
5. Pregas peritoneais
6. Omento (maior e menor)
7. Bursa omental
8. Recessos peritoneais pélvicos
9. Parede abdominal
10. Diafragma
11. Vascularização tegumentar
12. Drenagem linfática
13. Estômago
14. Baço
15. Intestino
16. Fígado - sistema hepatobiliar
17. Pâncreas
18. Glândulas adrenais
19. Sistema urinário
20. Rins
21. Ureteres
22. Bexiga
23. Uretra
24. Sistema genital masculino
25. Sistema genital feminino
26. Sistema linfático
27. Dissecção
28. Região tegumentar
29. Acesso abdominal
30. Pregas peritoniais
31. Intestino grosso
32. Sistema urinário
33. Rim
34. Sistema genital feminino
35. Abdomem cranial
36. Estômago
37. Reprodutor masculino
38. Anatomia para cirurgia ortopédica
39. Ombro
40. Rádio e ulna
41. Ulna lateral + Cotovelo
42. Metacarpos
43. Úmero medial
44. Cotovelo medial
45. Pelve
46. Joelho
47. Tíbia lateral
48. Tíbia medial + Metatarsos

</details>

<details>
<summary><b>4. Oncologia para o cirurgião</b> — 6 aulas</summary>

Módulo `6ff6de01-4541-49a4-8fff-d6838afd305d`

1. Apresentação
2. Introdução a oncologia
3. Princípios básicos do paciente oncológico
4. Principais neoplasias na rotina cirúrgica
5. Neoplasia mamária em cadelas e gatas
6. Casos clínicos

</details>

<details>
<summary><b>5. Cirurgias do Sistema Urinário</b> — 40 aulas</summary>

Módulo `aeb1335e-1b9f-4df6-8c49-4f666bb9fe2f`

1. Anatomia e Clínica cirúrgica
2. Dreno de Blake
3. Cistostomia
4. Cistotomia
5. Cistectomia
6. Uretra
7. Uretrostomia escrotal em cães
8. Uretrostomia perineal em cães
9. Uretrostomia perineal em gatos
10. Prolapso de uretra
11. Ureter
12. Ureterotomia
13. Duplo J - Stents uretrais
14. SUB
15. Nefrotomia, pielotomia e nefrectomia
16. Teoria com Prof Tiago Prada
17. Acesso a cavidade abdominal
18. Acesso retro umbilical
19. Anatomia do Urinário
20. Nefrectomia
21. Nefrotomia
22. Uretrostomia pré escrotal
23. Uretrostomia escrotal
24. Uretrostomia pré púbica
25. Uretrostomia perineal no felino
26. Amputação de pênis (penectomia no cão)
27. Cistotomia
28. Neoureteroanastomose vesical
29. Neoureteroanastomose cutânea
30. Prostatectomia
31. Ureterotomia
32. Duplo J (Stent ureteral)
33. Fechamento da camada muscular
34. Fechamento do subcutâneo
35. Fechamento pele-derme
36. BÔNUS: Biópsia hepática
37. BÔNUS: Lobectomia hepática parcial
38. BÔNUS: Lobectomia hepática total
39. BÔNUS: Colecistectomia
40. BÔNUS: Adrenalectomia

</details>

<details>
<summary><b>6. Cirurgias do Trato Gastrointestinal</b> — 17 aulas</summary>

Módulo `8695c6c7-bf07-4eed-b620-26f2ab2fa19a`

1. Parte teórica
2. Acesso a cavidade abdominal
3. Anatomia do TGI
4. Gastrotomia
5. Torção gástrica
6. Gastropexia
7. Piloroplastia
8. Enterotomia
9. Enterectomia
10. Tampão seroso
11. Colectomia subtotal
12. Colopexia
13. Enterectomia pela sutura do tipo látero lateral
14. Fechamento da camada muscular
15. Fechamento do subcutâneo
16. Fechamento pele-derme
17. BÔNUS: Demonstração prática ministrada em curso ao vivo

</details>

<details>
<summary><b>7. Cirurgias Hepatobiliares</b> — 25 aulas</summary>

Módulo `103e74f8-6690-40ec-bb0f-cc0898802a80`

1. Anatomia básica e aplicada
2. Fígado
3. Anomalias Vasculares Portossistêmicas - SPS
4. Vesícula biliar
5. Pâncreas
6. Baço
7. Hemoperitônio em pequenos animais
8. Pano de campo
9. Acesso abdominal
10. Acesso Mercedes e Manobra de Pringle
11. Anatomia
12. Aspectos vasculares de um Shunt
13. Biópsia hepática por guilhotina
14. Biópsia hepática com punch
15. Lobectomia hepática lobo lateral esquerdo
16. Lobectomia hepática lobo quadrado
17. Colecistectomia
18. Colecistoduodenostomia
19. Lobectomia hepática com uso de grampeador linear cortante
20. Lobectomia hepática lobo lateral direito
21. Lobectomia com cistectomia
22. Lobectomia lobo lateral e medial esquerdo
23. Esplenectomia
24. Omentalização de cisto ou de abscesso pancreático
25. Pancreatectomia parcial

</details>

<details>
<summary><b>8. Cirurgias Torácicas</b> — 24 aulas</summary>

Módulo `4926d7ef-bb44-43d4-915c-5a2040ebc56d`

1. Disciplina e Professor
2. Anatomia
3. Dreno Torácico
4. Toracocentese
5. Patologias
6. Torção de Lobo Pulmonar
7. Quilotórax
8. Anomalias do Anel Vascular
9. Ruptura Diafragmática
10. Ducto Arterioso Patente
11. Efusão e Constrição Pericárdica
12. Pericardiocentese - Toracocentese
13. Ruptura Diafragmática
14. Acesso à cavidade torácica
15. Lobectomia pulmonar total
16. Dreno torácico no trans cirúrgico
17. Pericardectomia
18. DAP - Ducto Arterioso Persistente
19. PAAD - (Persistência do Quarto Arco)
20. Quilotórax (injeção de azul patente no linfonodo mesentérico)
21. Quilotórax (ligadura do ducto torácico)
22. Bônus: Trombéctomia
23. Reconstrução da Parede do Tórax
24. Toracorrafia

</details>

<details>
<summary><b>9. Cirurgia Reconstrutiva</b> — 23 aulas</summary>

Módulo `c162e30e-b007-4752-bd41-094673086c3d`

1. Cirurgia oncológica e estadiamento
2. Introdução a Cirurgia Plástica e Reparadora
3. Neoplasia
4. Flaps Subdérmicos - Figuras Geométricas
5. Flaps Subdérmicos Locais
6. Flaps Subdérmicos - Prega Bilateral
7. Flaps de Padrão Axial
8. Flap Artéria Omocervical
9. Flap Artéria Braquial Superficial
10. Flap Artéria Epigástrica Superficial - Caudal
11. Enxertos
12. Flap da Artéria Auricular Caudal
13. Flap da Artéria Omocervical
14. Flap da Artéria Torocodorsal
15. Flap da Artéria Genicular
16. Flap da Artéria Epigástrica Superficial Caudal
17. Flap Subdérmico da Prega Inguinal
18. Flap Subdérmico da Prega Axiliar
19. Flap da Artéria Tóraco Lateral
20. Flap Subdérmico de Avanço Unipediculado
21. Flap Subdérmico de Avanço Bipediculado
22. Flap Subdérmico Rotacional
23. Enxerto Livre

</details>

<details>
<summary><b>10. Cirurgias de Cabeça e Pescoço</b> — 28 aulas</summary>

Módulo `038ad3c8-0127-4657-aff4-fd58dceb899b`

1. Cirurgia dos linfonodos
2. Cirurgia de fístulas oronasais
3. Casos clínicos
4. Cirurgias da língua
5. Cirurgias do plano nasal
6. Cirurgia das glândulas salivares
7. Cirurgia de ouvido e orelhas
8. Cirurgias de traquéia
9. Cirurgia dos braquicefálicos
10. Cirurgia de laringe
11. Cirurgias para Colapso de Traquéia
12. Cirurgias de Mandibulectomia
13. Traqueostomia temporária
14. Traqueostomia permanente
15. Ressecção de anéis traqueais
16. Tireoidectomia
17. Esofogotomia cervical
18. Linfadenectomia mandibular
19. Linfadenectomia retrofaríngeo
20. Sialocele mandibular
21. Conchectomia parcial
22. Ablação total do conduto auditivo + Osteotomia da bulha timpânica
23. Nosectomia
24. Rinoplastia
25. Tonsilectomia + Estafilectomia
26. Correção de fenda/fissura palatina
27. Lateralização da aritenóide
28. Glossectomia

</details>

<details>
<summary><b>11. Cirurgias Oftálmicas Básicas</b> — 14 aulas</summary>

Módulo `2d797c2a-a7a4-4366-b841-a4e93bbfe186`

1. Apresentação
2. Entrópio - Teoria
3. Nódulo Palpebral
4. Prolapso da Glândula da Terceira Pálpebra
5. Proptose Traumática do Bulbo Ocular
6. Enucleação
7. Antissepsia
8. Correção de Entrópio - Hotz Celsus
9. Enucleação Transconjuntival
10. Enucleação Transpalpebral
11. H Plastia
12. Sepultamento da Glândula da Terceira Palpebra
13. V Plastia
14. Lista de instrumentais para cirurgias extraoculares

</details>

<details>
<summary><b>12. Anestesiologia para cirurgiões</b> — 1 aulas</summary>

Módulo `058e66dc-46b1-4d62-b57d-7549d232777b`

1. Anestesiologia para cirurgiões

</details>

<details>
<summary><b>13. Como precificar seu serviço</b> — 1 aulas</summary>

Módulo `ed9adfef-5c3d-4b9f-b493-8b74f14a8dd7`

1. Como precificar seu serviço

</details>

<details>
<summary><b>14. Posicionamento Estratégico</b> — 1 aulas</summary>

Módulo `4177f540-3262-4d50-8391-54117fa05aa5`

1. Posicionamento Estratégico

</details>

### O Veterinário de Valor

- **ID:** `0939c680-0c6f-434a-855a-269ad96f7636`
- **Slug:** `o-veterinario-de-valor` · **Publicado:** sim · **Módulos:** 16 · **Aulas:** 70

<details>
<summary><b>0. Apresentação Plataforma Projeto Cirurgião</b> — 1 aulas</summary>

Módulo `17746aa7-6985-40a8-8cc7-71a5fc52992f`

1. Apresentação Plataforma Projeto Cirurgião

</details>

<details>
<summary><b>1. 5 pilares essenciais para o seu atendimento</b> — 1 aulas</summary>

Módulo `6920cd0f-90af-46a5-8049-f460502ba5f9`

1. 5 pilares essenciais para o seu atendimento

</details>

<details>
<summary><b>2. A jornada do cliente</b> — 1 aulas</summary>

Módulo `f9e2ae7f-d650-4e4f-87a9-42085b740de1`

1. A jornada do cliente

</details>

<details>
<summary><b>3. Como construir a sua presença digital</b> — 25 aulas</summary>

Módulo `13f4cadb-b18d-4c08-91e7-34f22848fb51`

1. 1)O que irá aprender
2. 2)A importância do marketing digital para Médicos Veterinários
3. 3)Por onde começar? [briefing e benchmarking]
4. 4)Criação da Persona e Urgências ocultas
5. 5)Fundamentos de uma Linha editorial
6. 6)Como criar uma linha editorial para Médicos Veterinários
7. 7)Definindo seus objetivos e metas claras
8. 8) Elaboração de copywriting
9. 9) Conceito de funil de vendas
10. 10) Funil de vendas na prática
11. 11) Identidade visual
12. 12) Utilização de fotos profissionais
13. 13) Funil de vendas atrativo aplicado ao Instagram
14. 14) Instagram: Reels dinâmicos
15. 15) Instagram: Stories para Veterinários
16. 16) Recursos destaque e fixar no Instagram
17. 17) Ferramentas para alavancar seu negócio
18. 18) Como criar um perfil da empresa no Google
19. 19) Anunciar perfil no Google
20. 20) Criar campanhas: Instagram e Facebook
21. 21) O que precisa ter no site do Médico Veterinário
22. 22) Aplicativos para criação de conteúdo
23. 23) Oratória e comunicação
24. 24) Análise de perfil
25. 25) Agradecimentos

</details>

<details>
<summary><b>4. Como nos resguardar juridicamente</b> — 10 aulas</summary>

Módulo `696dad58-6d19-4068-969a-9be4d276b9ac`

1. 1)Introdução
2. 2)Introduções Conceituais
3. 3)Prontuário
4. 4)Guarda e Sigilo
5. 5)Dever de Informação
6. 6)O Termo de Consentimento Livre e Esclarecido
7. 7)Pré e Pós Operatório
8. 8)O Contrato de Prestação de Serviço
9. 9)Considerações Finais
10. 10)Perguntas e Respostas

</details>

<details>
<summary><b>5. Direito Empresarial</b> — 1 aulas</summary>

Módulo `cc5e2ef2-189e-4958-9739-b72bcf355504`

1. Direito Empresarial

</details>

<details>
<summary><b>6. Inteligência emocional</b> — 22 aulas</summary>

Módulo `ef2dc0fc-1e9f-43dd-a24f-0380dd692aa2`

1. 1)Introdução
2. 2)Descubra sua personalidade
3. 3)Para que serve o eneagrama
4. 4)Como utilizar o eneagrama de forma prática
5. 5)8 O poderoso
6. 6)Explicação
7. 7)9 O mediador
8. 8)1 O perfeccionista
9. 9)2 O ajudante
10. 10)3 O vencedor
11. 11)4 O intenso
12. 12)5 O analítico
13. 13)6 O precavido
14. 14)7 O otimista
15. 15)Introdução
16. 16)Instintos e Níveis de consciência
17. 17)Como os instintos são formados
18. 18)Instinto autopreservação
19. 19)Instinto social
20. 20)Instinto sexual
21. 21)Reequilíbrio dos instintos
22. 22)Encerramento

</details>

<details>
<summary><b>7. Descomplicando a gestão financeira</b> — 1 aulas</summary>

Módulo `6d83e075-9944-467c-a335-807808523d64`

1. Descomplicando a gestão financeira

</details>

<details>
<summary><b>8. O corpo fala!</b> — 0 aulas</summary>

Módulo `33f85498-764e-4ed5-949b-73d1bf1f3c2f`


</details>

<details>
<summary><b>9. Presença digital</b> — 1 aulas</summary>

Módulo `29336fe5-d619-4c7d-bfe0-2826b9759527`

1. Presença digital

</details>

<details>
<summary><b>10. Construindo uma mentalidade de alto valor</b> — 1 aulas</summary>

Módulo `d7217a3e-9a54-4d7a-a594-5b20e208e350`

1. Construindo uma mentalidade de alto valor

</details>

<details>
<summary><b>11. Como precificar seu serviço</b> — 1 aulas</summary>

Módulo `0ce7bdc8-b8eb-42a6-905c-485db2caaa29`

1. Como precificar seu serviço

</details>

<details>
<summary><b>12. Aprimorando a nossa linguagem não verbal</b> — 2 aulas</summary>

Módulo `3c4aa1af-63cc-4a0e-9492-41e357d6ec88`

1. Aprimorando a nossa linguagem não verbal - Treinamento teórico
2. Aprimorando a nossa linguagem não verbal  - Treinamento Prático

</details>

<details>
<summary><b>13. Nossa imagem fala mais que mil palavras</b> — 1 aulas</summary>

Módulo `2476567d-5d67-46a8-939e-6e9c9e52e4b0`

1. Nossa imagem fala mais que mil palavras

</details>

<details>
<summary><b>14. O seguro de responsabilidade civil</b> — 1 aulas</summary>

Módulo `ac07b63f-9a67-4df0-ac67-739a583225f0`

1. O seguro de responsabilidade civil

</details>

<details>
<summary><b>15. O impacto dos nossos resultados</b> — 1 aulas</summary>

Módulo `84ac8b78-e145-496e-b0c2-e661187c4678`

1. O impacto dos nossos resultados

</details>

### E-books

- **ID:** `d59ece49-5a3b-4b69-9376-0bb0ecf24f19`
- **Slug:** `e-books1976902248` · **Publicado:** sim · **Módulos:** 3 · **Aulas:** 3

<details>
<summary><b>0. Como se tornar um Cirurgião Volante</b> — 1 aulas</summary>

Módulo `5d0ac32c-fccd-4320-9b25-7a137696552a`

1. E-book Como se tornar um Cirurgião Volante

</details>

<details>
<summary><b>1. Como vender os nossos serviços</b> — 1 aulas</summary>

Módulo `4d789ba5-61b1-4d6f-a5e1-084f8b316e09`

1. Como vender os nossos serviços

</details>

<details>
<summary><b>2. Direcionamento para a Residência</b> — 1 aulas</summary>

Módulo `4a96bd0e-5866-4ebf-936e-b56e3d5849b2`

1. E-book Direcionamento para a Residência

</details>

### Aprofundamento Ortopedia

- **ID:** `cf829da9-3afd-480e-990d-6d1fb28817ef`
- **Slug:** `aprofundamento-ortopedia` · **Publicado:** sim · **Módulos:** 4 · **Aulas:** 39

<details>
<summary><b>0. Anatomia aplicada à cirurgia ortopédica</b> — 14 aulas</summary>

Módulo `86e808f1-0a42-41f4-b334-e2a818352949`

1. Introdução, membros e planos
2. Membros torácicos
3. Membros pélvicos
4. Anatomia para cirurgia ortopédica
5. Ombro
6. Rádio e ulna
7. Ulna lateral + Cotovelo
8. Metacarpos
9. Úmero medial
10. Cotovelo medial
11. Pelve
12. Joelho
13. Tíbia lateral
14. Tíbia medial + Metatarsos

</details>

<details>
<summary><b>1. Pelve</b> — 5 aulas</summary>

Módulo `38277e4f-cdab-4499-979b-0155c004f11c`

1. Acesso cirúrgico ao corpo de ílio
2. Osteossíntese de corpo de ílio
3. Possibilidades de estabilização de corpo de ílio
4. Fechamento / síntese
5. Ressecção de cabeça e colo femoral (Colocefalectomia)

</details>

<details>
<summary><b>2. Membro pélvico</b> — 13 aulas</summary>

Módulo `3945aecd-6c3e-4a66-899e-ce1f56f50e7d`

1. Preparação do membro
2. Acesso cirúrgico de fêmur
3. Passagem de pino intramedular no fêmur
4. Implantar placa no fêmur
5. Osteossíntese de fêmur (cadáver)
6. Fechamento / síntese do acesso cirúrgico de fêmur
7. Luxação intertársica
8. Luxação tibiotársica
9. Acesso cirúrgico à tibia
10. Passagem de pino intramedular na tíbia
11. Implantar placa na tíbia
12. Osteossíntese de tíbia (cadáver)
13. Parafuso lag na tíbia

</details>

<details>
<summary><b>3. Membro torácico</b> — 7 aulas</summary>

Módulo `7a9e9453-dd93-46ce-9488-1b2dcbc007aa`

1. Acesso cirúrgico LATERAL de úmero
2. Acesso cirúrgico MEDIAL de úmero
3. Passagem de pino intramedular no úmero
4. Implantar placa na face lateral do úmero
5. Implantar placa na face medial do úmero
6. Placa  lateral versus medial no úmero
7. Passagem de pino intramedular no rádio

</details>

### Treinamentos | Pós graduação

- **ID:** `6b6313a3-23e6-4a73-9b6a-ce2089604bbe`
- **Slug:** `treinamentos-pos-graduacao2080353611` · **Publicado:** sim · **Módulos:** 8 · **Aulas:** 192

<details>
<summary><b>0. Encontros semanais ao vivo(1)</b> — 12 aulas</summary>

Módulo `62e8f321-d0b6-434e-9a42-e748e97df86b`

1. Encontro ao vivo 15/01/2025
2. Encontro ao vivo 22/01/2025
3. Encontro ao vivo 29/01/2025
4. Encontro ao vivo 07/02/2025
5. Encontro ao vivo 13/02/2025
6. Encontro ao vivo 19/02/2025
7. Encontro ao vivo 26/02/2025
8. Encontro ao vivo 06/03/2025
9. Encontro ao vivo 12/03/2025 - Início marketing
10. Encontro ao vivo 19/03/2025
11. Encontro ao vivo 26/03/2025
12. Encontro ao vivo 02/04/2025

</details>

<details>
<summary><b>0. Oftalmologia - Gabriela Madruga</b> — 51 aulas</summary>

Módulo `d580376b-47a8-469b-9b9e-1b241e05c8c4`

1. Órbita, pálpebra e bulbo ocular
2. Pálpebra
3. Tunica fibrosa (córnea, limbo, conjuntiva e esclera)
4. Tunica vascular (íris, corpo ciliar e coróide)
5. Tunica nervosa (retina e nervo óptico)
6. Instalações, equipamento e materiais
7. Cronologia do exame: Anamnese, inspeção geral e teste da lágrima de Schirmer)
8. Cronologia do exame: Reflexos
9. Cronologia do exame: Pálpebras
10. Cronologia do exame: câmara anterior,anestesia tópica,pressão intraocular,gonioscopia,dilatação pupilar,exame da lente,vítreo
11. Cronologia do exame: retina,corantes especiais e exames complementares
12. Perfuração corneana e prolapso de íris
13. Úlcera de córnea
14. Endoftalmite
15. Uveíte
16. Glaucoma agudo
17. Proptose do bulbo ocular
18. Órbita,músculos extraoculares,exame clínico/anamnese e exoftalmia
19. Enoftalmia e abcesso orbitário/celulite
20. Polimiosite dos músculos extraoculares e trauma e proptose do bulbo oculas
21. Enfizema orbitário,prolapso da gordura orbitária,cirurgias da órbita,estrabismo
22. Pálpebra e anormalidade de cílios (distiquíase e cílio ectópico)
23. Anormalidade das pálpebras (ectrópio,entrópio,macrobléfaro e triquíase de carúncula)
24. Prega nasal proeminente,triquíase,nódulo palpebral
25. Macrobléfaro-ectrópio e entrópio,laceração palpebral,blefarite,síndrome ocular do braquicefálico
26. Sistema lacrimal,composição da lágrima e ceratoconjuntivite seca
27. Continuação das causas da ceratoconjuntivite seca
28. Tratamento ceratoconjuntivite seca
29. Protusão da glândula da terceira pálpebra,sepultamento da glândula da terceira pálpebra,cisto da glândula da terceira pálpebra,eversão da cartilagem da terceira pálpebra,drenagem da lágrima
30. Conjuntivite e seus tipos
31. Conjuntivite e seus tipos,herper vírus x clamídia
32. Ceratite ulcerativa e seus tipos
33. Úlcera herpética
34. Úlcera profunda exposição da membrana de Descemet
35. Flap de terceira pálpebra,úlcera química e melting
36. Ceratite infecciosa cristalina,ceratite punctata,ceratite parasitária,microfilaria,abcesso corneano,ceratite neurogênica
37. Ceratite neurotrófica,ceratite neuroparalítica,ceratite superficial crônica,ceratite pigmentar
38. Ceratites cristalinas e não cristalinas
39. Anatomia,doença do desenvolvimento e membrana pupilar persistente
40. Aniridia de íris,hipoplasia de íris,atrofia de íris,cisto uveal e inflação intraocular
41. Sinais clínicos
42. Tratamento e doenças
43. Anatomia e etiologia da catarata
44. Tratamento da catarata
45. O que é o glaucoma?
46. Diagnóstico e diferenciação
47. Tratamentos
48. Afecções do segmento posterior
49. Doenças e diagnóstico
50. Doenças mais comuns na rotina,alterações sistemicas e tratamento
51. Doenças,tratamento e considerações finais

</details>

<details>
<summary><b>1. Sedoanalgesia em cães e gatos - Alex Santana</b> — 41 aulas</summary>

Módulo `49c6ea0f-4089-4189-a18d-7f337191c9c9`

1. Introdução
2. Avaliação pré-anestésica
3. Objetivos da avaliação pré-anestésica
4. Identificação do animal
5. Anamnese
6. Avaliação do paciente
7. Risco Anestésico
8. Determinação do risco anestésico
9. Escolha do protocolo
10. Função da medicação pré-anestésica
11. Sistema nervoso
12. Efeitos fisiológicos
13. Protocolo das 3 caixas
14. Objetivo da medicação pré-anestésica
15. Fármacos para a medicação pré-anestésica
16. Sedativos e tranquilizantes
17. Alfa2 agonistas
18. Benzodiazepínicos
19. Analgésicos
20. Opioides
21. Metadona
22. Analgesia multimodal
23. Objetivos clássicos da anestesiologia
24. Sulfato de magnésio
25. Dexmedetomidina
26. Soluções analgésicas - Melk, Milk e Filk
27. Soluções analgésicas - Melk, Milk e Filk
28. Soluções analgésicas - DexRemiFilkMg
29. Dor e processo inflamatório
30. AINES e dipirona
31. Derivados de ácidos propiônicos
32. Oxicans - Inibidores preferenciais COX-2
33. Coxibes - Inibidores seletivos COX-2
34. Piprant - Antagonista do receptor 4 da PGE2
35. Amitriptilina
36. Trazodona
37. Maropitant
38. Gabapentinóides
39. Amantadina
40. Cetamina
41. Finalização

</details>

<details>
<summary><b>2. Manejo de feridas</b> — 32 aulas</summary>

Módulo `eb077d63-c316-4023-812f-6510c69e6b1b`

1. Introdução
2. Anatomia da pele
3. Classificação de feridas
4. Cicatrização de feridas
5. Fatores que interferem na cicatrização
6. Fisiologia da cicatrização
7. Fase inflamatória
8. Fase proliferativa
9. Fase de maturação
10. Diferença na cicatrização de cães e gatos
11. Atendendo uma ferida
12. Limpeza
13. Debridamento
14. Debridamento cirúrgico
15. Debridamento autolítico
16. Condutas para cicatrização mais rápida
17. Drenos cirúrgicos
18. Drenos passivos e ativos
19. Cuidados
20. Produto tópico e curativo
21. Confecção camadas
22. Tela fenestrada
23. Tie over
24. Quando realizar a troca
25. Escolha do produto tópico
26. Antissépticos e antibióticos
27. PHMB
28. Antibióticos
29. Curativos tecnológicos
30. Espuma de poliuretano
31. Ferida, o que você precisa saber!
32. Casos

</details>

<details>
<summary><b>3. O que o platonista precisa saber - César Ribeiro</b> — 4 aulas</summary>

Módulo `046c7648-c45f-439a-a0b0-cb9590423b06`

1. Gasometria
2. Gasometria - Casos clínicos
3. Dispneia
4. Drogas de emergência

</details>

<details>
<summary><b>4. Abordagem ao paciente politraumatizado - César Ribeiro</b> — 9 aulas</summary>

Módulo `d49616c7-cf74-4b4b-bad5-bc87100d612e`

1. Aula 1 - Introdução ao trauma
2. Aula 2 - Fisiopatogenia
3. Aula 3 - Triagem
4. Aula 4 -  Abordagem X
5. Aula 5 - Abordagem A
6. Aula 6 - Abordagem B
7. Aula 7 - Abordagem C
8. Aula 8 - Abordagem D
9. Aula 9 - Abordagem E (Trauma Crânio Encefálico)

</details>

<details>
<summary><b>5. Atualizações Clínicas</b> — 18 aulas</summary>

Módulo `0ba17a28-af1d-4d7b-9f63-e5fc6db6f8b2`

1. Conceitos de clínica médica para cirurgiões
2. Noções gerais sobre terapêutica
3. Posologia e prescrição
4. Modelos de prescrição
5. Exercícios de cálculos
6. Eutanásia na clínica de cães e gatos
7. Indicações para eutanásia
8. Fluidoterapia
9. Desidratação
10. Indicações de fluidoterapia e tipos de fluidos
11. Vias de administração de fluidos
12. Cateteres intravenosos
13. Escolha das veias
14. Velocidade de administração dos fluidos
15. Quantidade de fluidos a ser administrada
16. Aditivos na fluidoterapia
17. Cálculo de fluidoterapia
18. Exercícios de fluidoterapia

</details>

<details>
<summary><b>6. Encontros semanais ao vivo</b> — 25 aulas</summary>

Módulo `099ef6de-339a-4600-9cee-317a5a6e25b0`

1. Encontro ao vivo 15/01/2025
2. Encontro ao vivo 22/01/2025
3. Encontro ao vivo 29/01/2025
4. Encontro ao vivo 07/02/2025
5. Encontro ao vivo 13/02/2025
6. Encontro ao vivo 19/02/2025
7. Encontro ao vivo 26/02/2025
8. Encontro ao vivo 06/03/2025
9. Encontro ao vivo 12/03/2025 - Início marketing
10. Encontro ao vivo 19/03/2025
11. Encontro ao vivo 26/03/2025
12. Encontro ao vivo 02/04/2025
13. Encontro ao vivo 16/04/2025
14. Encontro ao vivo 23/04/2025
15. Encontro ao vivo 07/05/2025
16. Encontro ao vivo 15/05/2025
17. Encontro ao vivo 21/05/2025
18. Encontro ao vivo 28/05/2025
19. Encontro ao vivo 05/06/2025
20. Encontro ao vivo 10/06/2025
21. Encontro ao vivo 18/06/2025
22. Encontro ao vivo 25/06/2025 - whatsapp business
23. Encontro ao vivo 03/06/2025 - Robô whatsapp
24. Tiago Prada - Aula disgestório avançado (18/09/2025)
25. 02/10/2025 (início turma 2)

</details>

