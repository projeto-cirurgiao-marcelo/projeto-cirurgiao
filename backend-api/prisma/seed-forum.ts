/**
 * Seed de dados mock para o Forum
 *
 * Uso: npx ts-node prisma/seed-forum.ts
 *
 * Cria:
 * - 5 categorias
 * - 12 topicos distribuidos entre as categorias
 * - 27 respostas nos topicos
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do Forum...\n');

  // =============================================
  // 0. LIMPAR DADOS ANTIGOS DO FORUM
  // =============================================
  console.log('🧹 Limpando dados antigos do forum...');
  await prisma.forumReplyVote.deleteMany({});
  await prisma.forumTopicVote.deleteMany({});
  await prisma.forumReply.deleteMany({});
  await prisma.forumTopic.deleteMany({});
  await prisma.forumCategory.deleteMany({});
  console.log('  ✅ Dados antigos removidos\n');

  // Buscar usuarios existentes para usar como autores
  const users = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: 'asc' },
  });

  if (users.length === 0) {
    console.error('❌ Nenhum usuario encontrado no banco. Crie pelo menos 1 usuario primeiro.');
    process.exit(1);
  }

  console.log(`✅ Encontrados ${users.length} usuario(s): ${users.map(u => u.name).join(', ')}\n`);

  const mainUser = users[0];
  const secondUser = users[1] || users[0];
  const thirdUser = users[2] || users[0];

  // =============================================
  // 1. CATEGORIAS (com UUIDs validos)
  // =============================================
  console.log('📂 Criando categorias...');

  const categoriesData = [
    {
      id: randomUUID(),
      name: 'Duvidas Gerais',
      description: 'Perguntas gerais sobre cirurgia veterinaria e o curso',
      icon: 'help-circle',
      color: '#3B82F6',
      order: 1,
    },
    {
      id: randomUUID(),
      name: 'Cirurgia de Tecidos Moles',
      description: 'Discussoes sobre tecnicas de cirurgia em tecidos moles',
      icon: 'heart',
      color: '#EF4444',
      order: 2,
    },
    {
      id: randomUUID(),
      name: 'Ortopedia Veterinaria',
      description: 'Fraturas, luxacoes, proteses e tecnicas ortopedicas',
      icon: 'fitness',
      color: '#22C55E',
      order: 3,
    },
    {
      id: randomUUID(),
      name: 'Neurologia',
      description: 'Cirurgias e procedimentos neurologicos',
      icon: 'flash',
      color: '#F59E0B',
      order: 4,
    },
    {
      id: randomUUID(),
      name: 'Anestesia e Analgesia',
      description: 'Protocolos anestesicos, monitoracao e manejo da dor',
      icon: 'medical',
      color: '#8B5CF6',
      order: 5,
    },
  ];

  const categories = [];
  for (const cat of categoriesData) {
    const created = await prisma.forumCategory.create({ data: cat });
    categories.push(created);
    console.log(`  ✅ ${created.name} (${created.id})`);
  }

  // =============================================
  // 2. TOPICOS
  // =============================================
  console.log('\n📝 Criando topicos...');

  const topicsData = [
    // Duvidas Gerais (3 topicos)
    {
      title: 'Qual a melhor forma de praticar sutura antes de operar?',
      content: 'Estou no inicio do curso e gostaria de saber quais materiais posso usar para praticar sutura em casa. Alguem tem sugestoes de simuladores ou tecnicas com materiais simples? Ja vi que existem pads de silicone, mas nao sei se vale o investimento.',
      categoryIndex: 0,
      authorIndex: 0,
      isPinned: true,
      views: 234,
      upvotes: 15,
      downvotes: 1,
    },
    {
      title: 'Duvida sobre certificado do curso',
      content: 'Ao finalizar todos os modulos e quizzes, o certificado e emitido automaticamente? Ele tem algum tipo de validacao ou registro? Preciso saber para apresentar na minha clinica.',
      categoryIndex: 0,
      authorIndex: 1,
      views: 89,
      upvotes: 8,
      downvotes: 0,
    },
    {
      title: 'Recomendacoes de livros complementares',
      content: 'Alguem pode indicar bons livros de cirurgia veterinaria para complementar o conteudo do curso? Estou especialmente interessado em atlas cirurgicos com boas ilustracoes e descricoes passo a passo.',
      categoryIndex: 0,
      authorIndex: 2,
      views: 156,
      upvotes: 22,
      downvotes: 0,
      isSolved: true,
    },
    // Cirurgia de Tecidos Moles (3 topicos)
    {
      title: 'Tecnica de esplenectomia parcial em caes',
      content: 'No modulo 3 do curso, o professor demonstra a esplenectomia total. Mas em casos de toracao esplenica parcial, qual a melhor abordagem para preservar parte do baco? Alguem ja realizou esse procedimento e pode compartilhar sua experiencia?',
      categoryIndex: 1,
      authorIndex: 0,
      views: 67,
      upvotes: 5,
      downvotes: 0,
    },
    {
      title: 'Complicacoes pos-operatorias em gastropexia',
      content: 'Realizei uma gastropexia incisional conforme demonstrado no curso e o paciente apresentou seroma no local da incisao no 3o dia pos-op. Qual o manejo mais indicado? Drenagem ou tratamento conservador?',
      categoryIndex: 1,
      authorIndex: 1,
      views: 143,
      upvotes: 12,
      downvotes: 2,
    },
    {
      title: 'Diferenca entre ligadura simples e transfixante',
      content: 'No video de ovariohisterectomia, o professor menciona que em alguns casos e preferivel a ligadura transfixante ao inves da simples. Em quais situacoes especificas devo optar por cada uma? Existe diferenca significativa na seguranca?',
      categoryIndex: 1,
      authorIndex: 2,
      isPinned: true,
      views: 198,
      upvotes: 18,
      downvotes: 0,
    },
    // Ortopedia (2 topicos)
    {
      title: 'Fixacao externa vs placa em fratura de radio/ulna',
      content: 'Em fracoes diafisarias de radio e ulna em caes de pequeno porte, voces preferem fixacao externa ou placa com parafusos? Vi no curso que ambas as tecnicas sao apresentadas, mas qual tem melhor resultado na pratica clinica?',
      categoryIndex: 2,
      authorIndex: 0,
      views: 112,
      upvotes: 9,
      downvotes: 1,
    },
    {
      title: 'Ruptura de ligamento cruzado cranial - TPLO ou TTA?',
      content: 'Gostaria de uma discussao sobre as vantagens e desvantagens de cada tecnica (TPLO vs TTA) para correcao de ruptura de ligamento cruzado cranial em caes de medio e grande porte. Qual tecnica voces mais utilizam e por que?',
      categoryIndex: 2,
      authorIndex: 1,
      views: 276,
      upvotes: 31,
      downvotes: 3,
      isSolved: true,
    },
    // Neurologia (2 topicos)
    {
      title: 'Hemilaminectomia dorsolateral - duvidas sobre acesso',
      content: 'Estou estudando o modulo de neurologia e tenho duvidas sobre o acesso dorsolateral para hemilaminectomia em casos de extrussao de disco toracolombar. Qual a referencia anatomica mais confiavel para identificar o espaco intervertebral correto?',
      categoryIndex: 3,
      authorIndex: 2,
      views: 45,
      upvotes: 4,
      downvotes: 0,
    },
    {
      title: 'Prognostico em casos de hernia de disco grau V',
      content: 'Qual a experiencia de voces com o prognostico cirurgico em pacientes com hernia de disco toracolombar grau V (paraplegia com perda de nocicepcao profunda)? O tempo entre perda de funcao e cirurgia influencia significativamente no resultado?',
      categoryIndex: 3,
      authorIndex: 0,
      views: 189,
      upvotes: 14,
      downvotes: 0,
    },
    // Anestesia (2 topicos)
    {
      title: 'Protocolo anestesico para pacientes cardiopatas',
      content: 'Preciso operar um canino cardiopata (DMVM grau B2) para retirada de nodulo cutaneo. Qual protocolo anestesico voces recomendam? Estou pensando em usar fentanil na MPA ao inves de acepromazina. Sugestoes?',
      categoryIndex: 4,
      authorIndex: 1,
      views: 203,
      upvotes: 19,
      downvotes: 0,
    },
    {
      title: 'Bloqueio locorregional para mastectomia em gatas',
      content: 'No video do curso sobre bloqueios locais, o professor demonstra o bloqueio TAP. Alguem tem experiencia com esse bloqueio especificamente para mastectomias unilaterais em gatas? Qual volume e concentracao de bupivacaina utilizam?',
      categoryIndex: 4,
      authorIndex: 2,
      isClosed: true,
      views: 78,
      upvotes: 6,
      downvotes: 1,
    },
  ];

  const topics = [];
  for (const t of topicsData) {
    const author = [mainUser, secondUser, thirdUser][t.authorIndex];
    const category = categories[t.categoryIndex];

    const created = await prisma.forumTopic.create({
      data: {
        title: t.title,
        content: t.content,
        authorId: author.id,
        categoryId: category.id,
        isPinned: t.isPinned || false,
        isClosed: t.isClosed || false,
        isSolved: t.isSolved || false,
        views: t.views || 0,
        upvotes: t.upvotes || 0,
        downvotes: t.downvotes || 0,
      },
    });
    topics.push(created);
    console.log(`  ✅ [${category.name}] ${created.title.substring(0, 50)}...`);
  }

  // =============================================
  // 3. RESPOSTAS
  // =============================================
  console.log('\n💬 Criando respostas...');

  const repliesData = [
    // Respostas para "Qual a melhor forma de praticar sutura" (topic 0)
    {
      topicIndex: 0,
      authorIndex: 1,
      content: 'Eu comecei praticando com pele de banana! Parece simples mas a textura e muito parecida com a pele real. Depois evolui para pads de silicone da marca SurgiReal. Recomendo muito, vale o investimento.',
      upvotes: 8,
    },
    {
      topicIndex: 0,
      authorIndex: 2,
      content: 'Alem da banana, lingua de boi e otima para praticar! Tem varias camadas de tecido e voce consegue treinar diferentes profundidades de sutura. O professor mencionou isso no modulo 2 tambem.',
      upvotes: 12,
    },
    {
      topicIndex: 0,
      authorIndex: 0,
      content: 'Obrigado pelas dicas! Vou tentar com a banana primeiro e depois investir no pad de silicone. Alguem sabe onde comprar o SurgiReal no Brasil?',
      upvotes: 2,
    },
    {
      topicIndex: 0,
      authorIndex: 1,
      content: 'Voce encontra na MedVet Store ou no Mercado Livre. Custa em torno de R$150-200. Tambem existe um modelo mais barato da marca nacional VetSim por uns R$80.',
      upvotes: 5,
    },
    // Respostas para "Recomendacoes de livros" (topic 2)
    {
      topicIndex: 2,
      authorIndex: 0,
      content: 'O "Tecnica Cirurgica em Pequenos Animais" do Fossum e a biblia da cirurgia vet. Tem a versao digital tambem, que facilita a consulta rapida. Para ortopedia especificamente, o "AO Principles of Fracture Management" e excelente.',
      upvotes: 15,
    },
    {
      topicIndex: 2,
      authorIndex: 1,
      content: 'Concordo com o Fossum! Tambem recomendo o "Atlas de Cirurgia de Pequenos Animais" do Brinker, Piermattei e Flo para ortopedia. As ilustracoes sao fantasticas.',
      upvotes: 10,
    },
    {
      topicIndex: 2,
      authorIndex: 2,
      content: 'Para neurologia cirurgica, o "Small Animal Spinal Disorders" do Platt e Olby e indispensavel. Tem descricoes muito detalhadas de cada procedimento.',
      upvotes: 7,
    },
    // Respostas para "Complicacoes em gastropexia" (topic 4)
    {
      topicIndex: 4,
      authorIndex: 0,
      content: 'Seroma pos gastropexia e relativamente comum. Na minha experiencia, se for pequeno, tratamento conservador com compressas mornas resolve em 5-7 dias. Se for volumoso ou houver sinais de infeccao, drenagem asseptica.',
      upvotes: 9,
    },
    {
      topicIndex: 4,
      authorIndex: 2,
      content: 'Concordo com o tratamento conservador na maioria dos casos. Uma dica: use um curativo compressivo tipo bandagem abdominal nos primeiros 3-5 dias pos-op para prevenir a formacao do seroma.',
      upvotes: 6,
    },
    // Respostas para "Ruptura de ligamento cruzado" (topic 7)
    {
      topicIndex: 7,
      authorIndex: 0,
      content: 'Na minha pratica, uso TPLO na grande maioria dos casos. Os resultados a longo prazo sao excelentes e a curva de aprendizado, apesar de ingreme, compensa. A taxa de complicacoes e bem baixa apos dominar a tecnica.',
      upvotes: 14,
    },
    {
      topicIndex: 7,
      authorIndex: 2,
      content: 'Eu prefiro TTA para caes de medio porte e TPLO para grande porte. A TTA tem a vantagem de ser tecnicamente mais simples e o tempo cirurgico tende a ser menor. Ambas tem resultados funcionais similares na literatura.',
      upvotes: 11,
    },
    {
      topicIndex: 7,
      authorIndex: 1,
      content: 'Ponto importante: o angulo do plato tibial influencia na escolha. Com APT > 30 graus, TPLO tende a ser superior. Com APT normal, TTA funciona muito bem. Sempre meco o APT na radiografia pre-operatoria.',
      upvotes: 18,
    },
    // Respostas para "Hemilaminectomia" (topic 8)
    {
      topicIndex: 8,
      authorIndex: 0,
      content: 'A melhor referencia e o processo acessorio da vertebra cranial ao espaco afetado. Use a radiografia/TC pre-operatoria para contar os espacos a partir de L7-S1 (mais facil de identificar). No trans-cirurgico, palpe os processos espinhosos.',
      upvotes: 3,
    },
    {
      topicIndex: 8,
      authorIndex: 1,
      content: 'Uma dica pratica: coloque um marcador radiopaco (agulha hipondermica) no processo espinhoso que voce identificou e tire uma radiografia confirmatoria antes de iniciar a laminectomia. Previne operar o espaco errado.',
      upvotes: 5,
    },
    // Respostas para "Prognostico hernia grau V" (topic 9)
    {
      topicIndex: 9,
      authorIndex: 1,
      content: 'Na literatura, pacientes com perda de nocicepcao profunda ha menos de 24-48h ainda tem prognostico razoavel (50-60% de recuperacao funcional). Apos 48h sem nocicepcao, cai drasticamente para menos de 5%. O fator tempo e crucial.',
      upvotes: 11,
    },
    {
      topicIndex: 9,
      authorIndex: 2,
      content: 'Tive dois casos recentes: um com perda ha 12h recuperou completamente apos descompressao. Outro com perda ha 5 dias nao teve melhora. O prognostico realmente se correlaciona fortemente com a duracao da perda de nocicepcao.',
      upvotes: 8,
    },
    // Respostas para "Protocolo anestesico cardiopatas" (topic 10)
    {
      topicIndex: 10,
      authorIndex: 0,
      content: 'Para B2 em procedimento curto, uso: MPA com metadona (0.3mg/kg IM), inducao com propofol em bolus lento titulado, manutencao com isoflurano em concentracao minima. Evito acepromazina pela hipotensao.',
      upvotes: 13,
    },
    {
      topicIndex: 10,
      authorIndex: 2,
      content: 'Complementando: monitore PA invasiva se possivel, ECG continuo e capnografia. A fluidoterapia deve ser cautelosa (3-5 ml/kg/h) para nao sobrecarregar. Tenha dobutamina disponivel caso necessario.',
      upvotes: 9,
    },
    {
      topicIndex: 10,
      authorIndex: 1,
      content: 'Uma alternativa ao isoflurano e usar infusao continua de propofol (CRI) com fentanil. Permite titulacao mais precisa e menor depressao miocardica comparada aos inalatorios. Funciona muito bem em cardiopatas.',
      upvotes: 7,
    },
    // Respostas para "Bloqueio locorregional mastectomia" (topic 11)
    {
      topicIndex: 11,
      authorIndex: 0,
      content: 'Uso bupivacaina 0.25% no bloqueio TAP para mastectomia unilateral em gatas. Volume de 0.3 ml/kg por ponto, com 2-3 pontos de injecao ao longo da parede abdominal. Excelente analgesia trans e pos-operatoria.',
      upvotes: 4,
    },
    {
      topicIndex: 11,
      authorIndex: 1,
      content: 'Alem do TAP, associo um splash block com bupivacaina diluida no leito cirurgico antes de fechar. A combinacao dos dois proporciona analgesia multimodal muito boa para as primeiras 6-8 horas.',
      upvotes: 3,
    },
    // Respostas para "Diferenca ligadura simples e transfixante" (topic 5)
    {
      topicIndex: 5,
      authorIndex: 0,
      content: 'A ligadura transfixante e preferivel quando o pediculo e largo ou quando ha muito tecido adiposo (ex: OH em cadelas obesas). A transfixante ancora o fio no tecido, evitando deslizamento. Em pediculos finos, a simples e suficiente.',
      upvotes: 14,
    },
    {
      topicIndex: 5,
      authorIndex: 1,
      content: 'Regra pratica que uso: se o pediculo tem mais de 1cm de diametro, transfixante. Menos de 1cm, simples. Em gatas jovens sem gordura, a ligadura simples dupla funciona perfeitamente.',
      upvotes: 10,
    },
    // Respostas para "Esplenectomia parcial" (topic 3)
    {
      topicIndex: 3,
      authorIndex: 1,
      content: 'Para esplenectomia parcial, prefiro a tecnica com stapler (TA) quando disponivel. Posiciono o stapler na area de transicao entre tecido viavel e nao viavel, e a hemostasia e excelente. Sem stapler, use ligaduras individuais dos vasos.',
      upvotes: 4,
    },
    {
      topicIndex: 3,
      authorIndex: 2,
      content: 'Sem stapler, a tecnica de ligadura em massa com fio absorvivel 2-0 funciona bem. Divida o parenquima com cuidado usando hemostasia digital e ligue os vasos individualmente. E mais demorado mas igualmente eficaz.',
      upvotes: 3,
    },
    // Resposta para "Fixacao externa vs placa" (topic 6)
    {
      topicIndex: 6,
      authorIndex: 2,
      content: 'Em caes toy e mini, prefiro placa com parafusos de bloqueio (LCP) por proporcionar fixacao mais rigida e permitir retorno funcional mais rapido. A fixacao externa pode ser complicada pelo tamanho reduzido dos ossos.',
      upvotes: 6,
    },
    {
      topicIndex: 6,
      authorIndex: 1,
      content: 'Depende muito do tipo de fratura. Transversas simples: placa. Cominutivas ou expostas: fixacao externa permite melhor manejo da ferida. Em fraturas abertas contaminadas, fixacao externa e gold standard.',
      upvotes: 8,
    },
  ];

  let replyCount = 0;
  for (const r of repliesData) {
    const author = [mainUser, secondUser, thirdUser][r.authorIndex];
    const topic = topics[r.topicIndex];

    await prisma.forumReply.create({
      data: {
        content: r.content,
        topicId: topic.id,
        authorId: author.id,
        upvotes: r.upvotes || 0,
        downvotes: 0,
      },
    });
    replyCount++;
  }
  console.log(`  ✅ ${replyCount} respostas criadas`);

  // =============================================
  // RESUMO
  // =============================================
  console.log('\n' + '='.repeat(50));
  console.log('🎉 Seed do Forum concluido!');
  console.log('='.repeat(50));
  console.log(`  📂 ${categories.length} categorias`);
  console.log(`  📝 ${topics.length} topicos`);
  console.log(`  💬 ${replyCount} respostas`);
  console.log('='.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
