import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  Play,
  Users,
  Trophy,
  Star,
  CheckCircle2,
  ArrowRight,
  Calendar,
  MapPin,
  MessageCircle,
  Instagram,
  Youtube,
  Stethoscope,
  Heart,
  BookOpen,
  Award,
} from 'lucide-react';

// Hoisted outside component to avoid re-creation on every render
const heroStats = [
  { icon: Users, label: 'Alunos Ativos', value: '10.000+' },
  { icon: BookOpen, label: 'Cursos', value: '50+' },
  { icon: Play, label: 'Horas de Conteúdo', value: '200+' },
  { icon: Trophy, label: 'Taxa de Satisfação', value: '98%' },
] as const;

const postGradFeatures = [
  { icon: Stethoscope, title: 'Técnicas Cirúrgicas', desc: 'Avançadas' },
  { icon: Trophy, title: 'Marketing', desc: 'Profissional' },
  { icon: Users, title: 'Networking', desc: 'Exclusivo' },
] as const;

const instructors = ['MARCELO', 'DRA RENATA', 'CESAR', 'FABIANO', 'GABRIELA', 'KADU'] as const;

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* ===== HERO SECTION ===== */}
      <section className="relative bg-gradient-to-br from-[rgb(var(--primary-800))] via-[rgb(var(--primary-500))] to-[rgb(var(--success-600))] text-white overflow-hidden">
        {/* Subtle veterinary-themed mesh pattern */}
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M40 10c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2s-2-.9-2-2v-6c0-1.1.9-2 2-2zm0 50c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2s-2-.9-2-2v-6c0-1.1.9-2 2-2zm20-20c0 1.1-.9 2-2 2h-6c-1.1 0-2-.9-2-2s.9-2 2-2h6c1.1 0 2 .9 2 2zm-50 0c0 1.1-.9 2-2 2H2c-1.1 0-2-.9-2-2s.9-2 2-2h6c1.1 0 2 .9 2 2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Decorative gradient orbs */}
        <div className="absolute top-20 -left-32 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 -right-32 w-96 h-96 bg-emerald-400/15 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 py-24 md:py-36 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge className="bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm text-sm px-5 py-2 border border-white/20">
              <Stethoscope className="mr-2 h-4 w-4" />
              Plataforma de Ensino em Cirurgia Veterinária
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-tight">
              Bem-vindo(a) a um novo jeito de{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-emerald-300 via-blue-200 to-cyan-300 bg-clip-text text-transparent">
                  aprender!
                </span>
                <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full opacity-60" />
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/85 max-w-3xl mx-auto leading-relaxed font-medium">
              O Projeto Cirurgião oferece uma metodologia inovadora e prática para que você domine as técnicas cirúrgicas com confiança. Eleve sua carreira para o próximo nível com aprendizado descomplicado e direto ao ponto.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button size="lg" className="bg-white text-blue-700 hover:bg-white/90 hover:shadow-xl text-base px-8 py-6 h-auto font-bold btn-premium">
                <Play className="mr-2 h-5 w-5" />
                Começar Agora
              </Button>
              <Button size="lg" variant="outline" className="border-2 border-white/40 text-white hover:bg-white hover:text-blue-700 text-base px-8 py-6 h-auto font-semibold backdrop-blur-sm">
                Conhecer os Cursos
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-16 max-w-3xl mx-auto">
              {heroStats.map((stat, i) => (
                <div key={i} className="text-center group">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm mb-3 group-hover:bg-white/20 transition-colors border border-white/10">
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div className="text-3xl font-extrabold tracking-tight">{stat.value}</div>
                  <div className="text-sm text-white/70 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="rgb(var(--bg-primary))"/>
          </svg>
        </div>
      </section>

      {/* ===== FEATURED COURSES ===== */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-semibold">
              <Award className="mr-2 h-4 w-4" />
              Nossos Cursos
            </Badge>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-5 tracking-tight">Conheça Nossos Cursos</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Cursos práticos e diretos ao ponto, desenvolvidos pelos melhores cirurgiões do Brasil
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Curso 1 */}
            <Card className="card-hover overflow-hidden group border-0 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="relative h-48 bg-gradient-to-br from-blue-50 to-blue-100 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Stethoscope className="h-20 w-20 text-blue-500/20 group-hover:scale-110 transition-transform duration-500" />
                </div>
                <Badge className="absolute top-4 right-4 bg-emerald-500 text-white border-0 shadow-md">
                  <Heart className="mr-1.5 h-3 w-3" />
                  Destaque
                </Badge>
              </div>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl group-hover:text-[rgb(var(--primary-500))] transition-colors">
                  Tecidos Moles na Prática
                </CardTitle>
                <CardDescription className="text-sm font-medium">
                  Domine as Cirurgias com Precisão
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Este treinamento vai além da teoria! Aprenda o passo a passo de mais de 150 cirurgias de tecidos moles, com vídeos detalhados e práticas orientadas pelos maiores cirurgiões do Brasil.
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Play className="h-4 w-4 text-[rgb(var(--primary-500))]" />
                    <span>150+ cirurgias</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">4.9/5.0</span>
                  </div>
                </div>
                <Button className="w-full btn-premium" size="lg">
                  Clique para saber mais!
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Curso 2 */}
            <Card className="card-hover overflow-hidden group border-0 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="relative h-48 bg-gradient-to-br from-amber-50 to-amber-100 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Trophy className="h-20 w-20 text-amber-500/20 group-hover:scale-110 transition-transform duration-500" />
                </div>
                <Badge className="absolute top-4 right-4 bg-amber-500 text-white border-0 shadow-md">
                  <Star className="mr-1.5 h-3 w-3" />
                  Top 10
                </Badge>
              </div>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl group-hover:text-[rgb(var(--primary-500))] transition-colors">
                  Top 10 Cirurgias de Rotina
                </CardTitle>
                <CardDescription className="text-sm font-medium">
                  O Essencial para Sua Prática Diária
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Este treinamento vai descomplicar as 10 principais cirurgias da rotina de tecidos moles! Aprimore a sua técnica com teoria direta ao ponto e vídeos demonstrativos práticos.
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[rgb(var(--primary-500))]" />
                    <span>10 cirurgias essenciais</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">4.8/5.0</span>
                  </div>
                </div>
                <Button className="w-full btn-premium" size="lg">
                  Clique para saber mais!
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Curso 3 */}
            <Card className="card-hover overflow-hidden group border-0 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="relative h-48 bg-gradient-to-br from-emerald-50 to-emerald-100 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <GraduationCap className="h-20 w-20 text-emerald-500/20 group-hover:scale-110 transition-transform duration-500" />
                </div>
                <Badge className="absolute top-4 right-4 bg-[rgb(var(--primary-500))] text-white border-0 shadow-md">
                  <BookOpen className="mr-1.5 h-3 w-3" />
                  Completo
                </Badge>
              </div>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl group-hover:text-[rgb(var(--primary-500))] transition-colors">
                  Plataforma Projeto Cirurgião
                </CardTitle>
                <CardDescription className="text-sm font-medium">
                  Acesso Total ao Conhecimento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A Plataforma Projeto Cirurgião oferece uma experiência de aprendizado completa para médicos veterinários, com mais de 200 horas de conteúdo especializado.
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Play className="h-4 w-4 text-[rgb(var(--primary-500))]" />
                    <span>200+ horas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">5.0/5.0</span>
                  </div>
                </div>
                <Button className="w-full btn-premium" size="lg">
                  Clique para conhecer!
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ===== PÓS-GRADUAÇÃO ===== */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-blue-50/80 to-emerald-50/80 dark:from-blue-950/20 dark:to-emerald-950/20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <Card className="overflow-hidden shadow-xl border-0 ring-1 ring-blue-200/60">
              <div className="bg-gradient-to-r from-[rgb(var(--primary-700))] via-[rgb(var(--primary-500))] to-[rgb(var(--success-600))] p-8 md:p-10 text-white relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />

                <div className="relative">
                  <Badge className="bg-white/15 text-white mb-4 text-sm px-4 py-1.5 backdrop-blur-sm border border-white/20">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Pós-Graduação
                  </Badge>
                  <h2 className="text-3xl md:text-4xl font-extrabold mb-4 tracking-tight">
                    Pós-graduação em Cirurgias de Tecidos Moles de Pequenos Animais
                  </h2>
                  <p className="text-lg text-white/85 font-medium">
                    O Passo Decisivo para Sua Excelência Cirúrgica e Destaque Profissional!
                  </p>
                </div>
              </div>
              <CardContent className="p-8 md:p-10 space-y-6">
                <p className="text-base text-muted-foreground leading-relaxed">
                  O único programa de pós-graduação do Brasil a ensinar sobre <strong className="text-foreground">Marketing, Vendas e Cirurgia!</strong> Aprimore suas habilidades em cirurgias de tecidos moles e se destaque no mercado com o nosso programa avançado.
                </p>

                <div className="grid md:grid-cols-3 gap-4">
                  {postGradFeatures.map((item, i) => (
                    <div key={i} className="flex flex-col items-center text-center p-5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 hover:shadow-md transition-all">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[rgb(var(--primary-500))]/10 mb-3">
                        <item.icon className="h-6 w-6 text-[rgb(var(--primary-500))]" />
                      </div>
                      <h3 className="font-bold mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <Button size="lg" className="w-full md:w-auto btn-premium" variant="default">
                  Conheça a Pós-Graduação!
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ===== COMMUNITY ===== */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-950/40 mb-4 ring-1 ring-blue-200/60">
              <Users className="h-10 w-10 text-[rgb(var(--primary-500))]" />
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              A Maior Comunidade de Cirurgiões Veterinários do Brasil!
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              No Projeto Cirurgião, você faz parte de uma rede de cirurgiões veterinários, compartilhando conhecimento e se conectando com profissionais de todo o país. Cresça junto com outros cirurgiões e tenha apoio em cada etapa da sua carreira.
            </p>
            <Button size="lg" variant="outline" className="text-base px-8 py-6 h-auto font-semibold border-2 hover:bg-blue-50 hover:border-blue-300 transition-all">
              <Users className="mr-2 h-5 w-5" />
              Junte-se à Comunidade
            </Button>
          </div>
        </div>
      </section>

      {/* ===== INSTRUCTORS ===== */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-5 tracking-tight">
              Aprenda com os Melhores Cirurgiões Veterinários do Brasil!
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Nossos professores são cirurgiões reconhecidos e atuantes. Eles trazem não apenas a teoria, mas suas experiências reais para você aprender com quem já enfrentou e superou os maiores desafios cirúrgicos.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 max-w-6xl mx-auto">
            {instructors.map((name, i) => (
              <div key={i} className="text-center group cursor-pointer">
                <div className="relative mb-4 overflow-hidden rounded-2xl aspect-square bg-gradient-to-br from-blue-100 to-emerald-100 group-hover:shadow-lg transition-all duration-300 group-hover:scale-[1.03] ring-1 ring-blue-200/40">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <GraduationCap className="h-14 w-14 text-blue-500/30 group-hover:text-blue-500/50 transition-colors" />
                  </div>
                </div>
                <h3 className="font-bold text-base group-hover:text-[rgb(var(--primary-500))] transition-colors">
                  {name}
                </h3>
                <p className="text-xs text-muted-foreground font-medium">Cirurgião Especialista</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TRAINING CALENDAR ===== */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 mx-auto mb-6 ring-1 ring-blue-200/60">
              <Calendar className="h-8 w-8 text-[rgb(var(--primary-500))]" />
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-5 tracking-tight">
              Calendário de Treinamentos Presenciais
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Confira abaixo as datas dos cursos presenciais e garanta sua vaga no próximo treinamento!
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="card-hover border-0 shadow-sm hover:shadow-lg transition-all">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40">
                    <MapPin className="h-5 w-5 text-[rgb(var(--primary-500))]" />
                  </div>
                  Imersão Presencial em Grupo
                </CardTitle>
                <CardDescription>Na sua cidade</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Treinamento prático em grupo com hands-on em diversas técnicas cirúrgicas. Experiência completa com os melhores cirurgiões.
                </p>
                <Button className="w-full btn-premium" size="lg">
                  Conheça as Cidades Disponíveis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="card-hover border-0 shadow-sm hover:shadow-lg transition-all ring-2 ring-emerald-200 dark:ring-emerald-800">
              <CardHeader>
                <Badge className="w-fit bg-emerald-500 text-white mb-2 border-0">
                  <Star className="mr-1.5 h-3 w-3" />
                  Exclusivo
                </Badge>
                <CardTitle className="text-xl flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                    <Trophy className="h-5 w-5 text-emerald-600" />
                  </div>
                  IMERSÃO 10X
                </CardTitle>
                <CardDescription>Programa prático individual personalizado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Programa individual com acompanhamento personalizado. Desenvolva suas habilidades com atenção exclusiva dos instrutores.
                </p>
                <Button className="w-full btn-premium bg-emerald-600 hover:bg-emerald-700" size="lg">
                  Faça Sua Aplicação
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ===== ABOUT ===== */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/10 dark:to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Sobre o Projeto Cirurgião
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Criado pelo <strong className="text-foreground">Prof. Marcelo Portilho</strong>, o Projeto Cirurgião é mais do que uma plataforma de ensino. É uma comunidade de desenvolvimento contínuo para médicos veterinários que desejam dominar as técnicas cirúrgicas e se destacar no mercado.
            </p>
            <p className="text-base text-muted-foreground font-medium">
              Sua Plataforma de Aprendizado Prático e Avançado
            </p>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-20 md:py-28 bg-gradient-to-r from-[rgb(var(--primary-700))] via-[rgb(var(--primary-500))] to-[rgb(var(--success-600))] text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-white/5 rounded-full -translate-y-36" />
        <div className="absolute bottom-0 right-1/4 w-56 h-56 bg-white/5 rounded-full translate-y-28" />

        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
              <MessageCircle className="h-8 w-8" />
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Precisa de Ajuda? Fale Conosco Agora Mesmo!
            </h2>
            <p className="text-lg text-white/85 font-medium">
              Nossa equipe está pronta para responder às suas dúvidas e fornecer todas as informações que você precisa para dar o próximo passo na sua carreira cirúrgica.
            </p>
            <Button size="lg" className="bg-white text-blue-700 hover:bg-white/90 text-base px-8 py-6 h-auto font-bold btn-premium">
              <MessageCircle className="mr-2 h-5 w-5" />
              Conversar com o Suporte!
            </Button>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-gray-900 text-gray-300 border-t border-gray-800">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="font-bold text-lg text-white">Projeto Cirurgião</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Plataforma educacional dedicada ao ensino de excelência em Medicina Veterinária.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-4 text-white">Precisa de Ajuda?</h3>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link href="/contact" className="text-gray-400 hover:text-blue-400 transition-colors">
                    Fale conosco
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-gray-400 hover:text-blue-400 transition-colors">
                    Termos de Uso
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-gray-400 hover:text-blue-400 transition-colors">
                    Políticas de Privacidade
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4 text-white">Nos acompanhe:</h3>
              <div className="flex gap-3">
                <a
                  href="https://instagram.com/oprojetocirurgiao"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800 text-gray-400 hover:bg-blue-600 hover:text-white transition-all duration-200 hover:scale-105"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="https://instagram.com/marcelo.portilho"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800 text-gray-400 hover:bg-blue-600 hover:text-white transition-all duration-200 hover:scale-105"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="https://youtube.com/@oprojetocirurgiao"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800 text-gray-400 hover:bg-red-600 hover:text-white transition-all duration-200 hover:scale-105"
                >
                  <Youtube className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            <p>&copy; 2025 Projeto Cirurgião - Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
