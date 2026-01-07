import Link from 'next/link';
import Image from 'next/image';
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
  Facebook,
  Instagram,
  Youtube,
} from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[rgb(var(--primary-600))] via-[rgb(var(--primary-500))] to-[rgb(var(--primary-400))] text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm text-base px-6 py-2">
              🎓 Plataforma de Ensino em Cirurgia Veterinária
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
              Bem-vindo(a) a um novo jeito de{' '}
              <span className="bg-gradient-to-r from-[rgb(var(--secondary-300))] to-[rgb(var(--accent-300))] bg-clip-text text-transparent">
                aprender!
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
              O Projeto Cirurgião oferece uma metodologia inovadora e prática para que você domine as técnicas cirúrgicas com confiança. Eleve sua carreira para o próximo nível com aprendizado descomplicado e direto ao ponto.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button size="lg" className="bg-white text-[rgb(var(--primary-600))] hover:bg-white/90 hover:shadow-xl text-lg px-8 py-6 h-auto">
                <Play className="mr-2 h-5 w-5" />
                Começar Agora
              </Button>
              <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-[rgb(var(--primary-600))] text-lg px-8 py-6 h-auto">
                Conhecer os Cursos
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-12">
              {[
                { icon: Users, label: 'Alunos Ativos', value: '10.000+' },
                { icon: GraduationCap, label: 'Cursos', value: '50+' },
                { icon: Play, label: 'Horas de Conteúdo', value: '200+' },
                { icon: Trophy, label: 'Taxa de Satisfação', value: '98%' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm mb-3">
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-sm text-white/80">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="rgb(var(--bg-primary))"/>
          </svg>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Conheça Nossos Cursos</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Cursos práticos e diretos ao ponto, desenvolvidos pelos melhores cirurgiões do Brasil
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Curso 1 */}
            <Card className="card-hover overflow-hidden group">
              <div className="relative h-48 bg-gradient-to-br from-[rgb(var(--primary-100))] to-[rgb(var(--primary-200))] overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <GraduationCap className="h-24 w-24 text-[rgb(var(--primary-500))] opacity-20" />
                </div>
                <Badge className="absolute top-4 right-4 bg-[rgb(var(--accent-500))] text-white">
                  Destaque
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-2xl group-hover:text-[rgb(var(--primary-600))] transition-colors">
                  Tecidos Moles na Prática
                </CardTitle>
                <CardDescription className="text-base">
                  Domine as Cirurgias com Precisão
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Este treinamento vai além da teoria! Aprenda o passo a passo de mais de 150 cirurgias de tecidos moles (da incisão até o último ponto de sutura), com vídeos detalhados e práticas orientadas pelos maiores cirurgiões do Brasil.
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Play className="h-4 w-4" />
                    <span>150+ cirurgias</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-[rgb(var(--secondary-500))] text-[rgb(var(--secondary-500))]" />
                    <span>4.9/5.0</span>
                  </div>
                </div>
                <Button className="w-full" size="lg">
                  Clique para saber mais!
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Curso 2 */}
            <Card className="card-hover overflow-hidden group">
              <div className="relative h-48 bg-gradient-to-br from-[rgb(var(--secondary-100))] to-[rgb(var(--secondary-200))] overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Trophy className="h-24 w-24 text-[rgb(var(--secondary-500))] opacity-20" />
                </div>
                <Badge className="absolute top-4 right-4 bg-[rgb(var(--secondary-500))] text-white">
                  Top 10
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-2xl group-hover:text-[rgb(var(--primary-600))] transition-colors">
                  Top 10 Cirurgias de Rotina
                </CardTitle>
                <CardDescription className="text-base">
                  O Essencial para Sua Prática Diária
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Este treinamento vai descomplicar as 10 principais cirurgias da rotina de tecidos moles! Aprimore a sua técnica cirurgia tendo acesso a uma teoria direta ao ponto e vídeos demonstrativos práticos orientados pelos maiores cirurgiões do Brasil.
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>10 cirurgias essenciais</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-[rgb(var(--secondary-500))] text-[rgb(var(--secondary-500))]" />
                    <span>4.8/5.0</span>
                  </div>
                </div>
                <Button className="w-full" size="lg">
                  Clique para saber mais!
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Curso 3 */}
            <Card className="card-hover overflow-hidden group">
              <div className="relative h-48 bg-gradient-to-br from-[rgb(var(--accent-100))] to-[rgb(var(--accent-200))] overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="h-24 w-24 text-[rgb(var(--accent-500))] opacity-20" />
                </div>
                <Badge className="absolute top-4 right-4 bg-[rgb(var(--primary-500))] text-white">
                  Completo
                </Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-2xl group-hover:text-[rgb(var(--primary-600))] transition-colors">
                  Plataforma Projeto Cirurgião
                </CardTitle>
                <CardDescription className="text-base">
                  Acesso Total ao Conhecimento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  A Plataforma Projeto Cirurgião oferece uma experiência de aprendizado completa para médicos veterinários, com mais de 200 horas de conteúdo especializado em diversas áreas da cirurgia.
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Play className="h-4 w-4" />
                    <span>200+ horas</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-[rgb(var(--secondary-500))] text-[rgb(var(--secondary-500))]" />
                    <span>5.0/5.0</span>
                  </div>
                </div>
                <Button className="w-full" size="lg">
                  Clique para conhecer!
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pós-graduação Section */}
      <section className="py-20 bg-gradient-to-br from-[rgb(var(--accent-50))] to-[rgb(var(--primary-50))] dark:from-[rgb(var(--accent-900))]/20 dark:to-[rgb(var(--primary-900))]/20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <Card className="overflow-hidden shadow-2xl border-2 border-[rgb(var(--primary-200))]">
              <div className="bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--accent-600))] p-8 text-white">
                <Badge className="bg-white/20 text-white mb-4 text-base px-4 py-1">
                  🎓 Pós-Graduação
                </Badge>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Pós-graduação em Cirurgias de Tecidos Moles de Pequenos Animais
                </h2>
                <p className="text-xl text-white/90">
                  O Passo Decisivo para Sua Excelência Cirúrgica e Destaque Profissional!
                </p>
              </div>
              <CardContent className="p-8 space-y-6">
                <p className="text-lg text-muted-foreground leading-relaxed">
                  O único programa de pós-graduação do Brasil a ensinar sobre <strong className="text-foreground">Marketing, Vendas e Cirurgia!</strong> Aprimore suas habilidades em cirurgias de tecidos moles e se destaque no mercado com o nosso programa avançado. Uma jornada completa de aprendizado teórico e prático para transformar seu futuro.
                </p>

                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { icon: GraduationCap, title: 'Técnicas Cirúrgicas', desc: 'Avançadas' },
                    { icon: Trophy, title: 'Marketing', desc: 'Profissional' },
                    { icon: Users, title: 'Networking', desc: 'Exclusivo' },
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
                      <item.icon className="h-10 w-10 text-[rgb(var(--primary-500))] mb-3" />
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <Button size="lg" className="w-full md:w-auto" variant="default">
                  Conheça a Pós-Graduação!
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[rgb(var(--accent-100))] mb-4">
              <Users className="h-10 w-10 text-[rgb(var(--accent-600))]" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold">
              A Maior Comunidade de Cirurgiões Veterinários do Brasil!
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              No Projeto Cirurgião, você faz parte de uma rede de cirurgiões veterinários, compartilhando conhecimento e se conectando com profissionais de todo o país. Cresça junto com outros cirurgiões e tenha apoio em cada etapa da sua carreira.
            </p>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 h-auto">
              <Users className="mr-2 h-5 w-5" />
              Junte-se à Comunidade
            </Button>
          </div>
        </div>
      </section>

      {/* Instructors Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Aprenda com os Melhores Cirurgiões Veterinários do Brasil!
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              No Projeto Cirurgião, nossos professores são cirurgiões reconhecidos e atuantes. Eles trazem não apenas a teoria, mas suas experiências reais para você aprender com quem já enfrentou e superou os maiores desafios cirúrgicos.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 max-w-6xl mx-auto">
            {['MARCELO', 'DRA RENATA', 'CESAR', 'FABIANO', 'GABRIELA', 'KADU'].map((name, i) => (
              <div key={i} className="text-center group cursor-pointer">
                <div className="relative mb-4 overflow-hidden rounded-full aspect-square bg-gradient-to-br from-[rgb(var(--primary-200))] to-[rgb(var(--accent-200))] group-hover:shadow-xl transition-all group-hover:scale-105">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <GraduationCap className="h-16 w-16 text-[rgb(var(--primary-500))] opacity-50" />
                  </div>
                </div>
                <h3 className="font-semibold text-lg group-hover:text-[rgb(var(--primary-600))] transition-colors">
                  {name}
                </h3>
                <p className="text-sm text-muted-foreground">Cirurgião Especialista</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Training Calendar Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Calendar className="h-16 w-16 text-[rgb(var(--primary-500))] mx-auto mb-6" />
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Calendário de Treinamentos Presenciais
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Confira abaixo as datas dos cursos presenciais e garanta sua vaga no próximo treinamento!
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <MapPin className="h-6 w-6 text-[rgb(var(--primary-500))]" />
                  Imersão Presencial Prática em Grupo
                </CardTitle>
                <CardDescription>Na sua cidade</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Treinamento prático em grupo com hands-on em diversas técnicas cirúrgicas. Experiência completa com os melhores cirurgiões.
                </p>
                <Button className="w-full" size="lg">
                  Conheça as Cidades Disponíveis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="card-hover border-2 border-[rgb(var(--accent-500))]">
              <CardHeader>
                <Badge className="w-fit bg-[rgb(var(--accent-500))] text-white mb-2">
                  Exclusivo
                </Badge>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-[rgb(var(--accent-500))]" />
                  IMERSÃO 10X
                </CardTitle>
                <CardDescription>Programa prático individual personalizado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Programa individual com acompanhamento personalizado. Desenvolva suas habilidades com atenção exclusiva dos instrutores.
                </p>
                <Button className="w-full" size="lg" variant="success">
                  Faça Sua Aplicação
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-gradient-to-br from-[rgb(var(--primary-50))] to-white dark:from-[rgb(var(--primary-900))]/10 dark:to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold">
              Sobre o Projeto Cirurgião
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Criado pelo <strong className="text-foreground">Prof. Marcelo Portilho</strong>, o Projeto Cirurgião é mais do que uma plataforma de ensino. É uma comunidade de desenvolvimento contínuo para médicos veterinários que desejam dominar as técnicas cirúrgicas e se destacar no mercado.
            </p>
            <p className="text-lg text-muted-foreground">
              Sua Plataforma de Aprendizado Prático e Avançado
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-[rgb(var(--primary-600))] to-[rgb(var(--accent-600))] text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <MessageCircle className="h-16 w-16 mx-auto" />
            <h2 className="text-4xl md:text-5xl font-bold">
              Precisa de Ajuda? Fale Conosco Agora Mesmo!
            </h2>
            <p className="text-xl text-white/90">
              Nossa equipe está pronta para responder às suas dúvidas e fornecer todas as informações que você precisa para dar o próximo passo na sua carreira cirúrgica.
            </p>
            <Button size="lg" className="bg-white text-[rgb(var(--primary-600))] hover:bg-white/90 text-lg px-8 py-6 h-auto">
              <MessageCircle className="mr-2 h-5 w-5" />
              Conversar com o Suporte!
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[rgb(var(--bg-secondary))] border-t border-border">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgb(var(--primary-500))] text-white shadow-lg">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <span className="font-bold text-lg">Projeto Cirurgião</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Plataforma educacional dedicada ao ensino de excelência em Medicina Veterinária.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Precisa de Ajuda?</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/contact" className="hover:text-[rgb(var(--primary-500))] transition-colors">
                    Fale conosco
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-[rgb(var(--primary-500))] transition-colors">
                    Termos de Uso
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-[rgb(var(--primary-500))] transition-colors">
                    Políticas de Privacidade
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Nos acompanhe:</h3>
              <div className="flex gap-3">
                <a
                  href="https://instagram.com/oprojetocirurgiao"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-[rgb(var(--primary-500))] text-muted-foreground hover:text-white transition-all hover:scale-110"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="https://instagram.com/marcelo.portilho"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-[rgb(var(--primary-500))] text-muted-foreground hover:text-white transition-all hover:scale-110"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="https://youtube.com/@oprojetocirurgiao"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-[rgb(var(--primary-500))] text-muted-foreground hover:text-white transition-all hover:scale-110"
                >
                  <Youtube className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>© 2025 Projeto Cirurgião - Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
