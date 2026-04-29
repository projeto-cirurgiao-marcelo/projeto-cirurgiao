/* primitives */
export {
  AtlasButton,
  atlasButtonVariants,
  type AtlasButtonProps,
} from "./primitives/AtlasButton";

export {
  AtlasCard,
  AtlasCardHeader,
  AtlasCardTitle,
  AtlasCardContent,
  AtlasCardFooter,
} from "./primitives/AtlasCard";

/* page blocks */
export { AtlasPageHeader } from "./page/AtlasPageHeader";
export { AtlasStatsInline, type InlineStat } from "./page/AtlasStatsInline";
export { AtlasFiltersRow, type FilterChip } from "./page/AtlasFiltersRow";
export { AtlasEmptyState } from "./page/AtlasEmptyState";
export { AtlasLoadingBar } from "./page/AtlasLoadingBar";
export { AtlasSkeletonCard } from "./page/AtlasSkeletonCard";
export { AtlasCompletionStrip } from "./page/AtlasCompletionStrip";

/* navigation */
export { AtlasSectionTabs, type SectionTab } from "./navigation/AtlasSectionTabs";

/* shell */
export {
  AtlasRail,
  type RailItem,
  type RailSection,
} from "./shell/AtlasRail";
export { AtlasRailUser } from "./shell/AtlasRailUser";
export {
  AtlasTopBar,
  AtlasIconButton,
  type BreadcrumbItem,
} from "./shell/AtlasTopBar";
export { AtlasAdminStrip } from "./shell/AtlasAdminStrip";
export { AtlasTabBar, type TabBarItem } from "./shell/AtlasTabBar";

/* feedback */
export {
  atlasToast,
  AtlasToaster,
  type AtlasToastOptions,
} from "./feedback/AtlasToast";

/* course */
export {
  AtlasCourseThumb,
  type AtlasCourseStatus,
  type AtlasCourseThumbVariant,
} from "./course/AtlasCourseThumb";
export { AtlasCourseCard } from "./course/AtlasCourseCard";
export { AtlasCourseRow } from "./course/AtlasCourseRow";
export { AtlasModuleCard } from "./course/AtlasModuleCard";
export {
  AtlasModuleSidebar,
  type LessonStatus,
  type SidebarLesson,
  type SidebarModule,
} from "./course/AtlasModuleSidebar";
export {
  AtlasStagesProgress,
  type Stage,
  type StageStatus,
} from "./course/AtlasStagesProgress";
export {
  AtlasSheet,
  AtlasSheetTrigger,
  AtlasSheetClose,
  AtlasSheetTitle,
  AtlasSheetDescription,
  AtlasSheetContent,
} from "./course/AtlasModuleSheet";
export {
  AtlasAssessmentCTA,
  type AssessmentMetaItem,
  type AssessmentStat,
} from "./course/AtlasAssessmentCTA";

/* synthesis */
export { AtlasSynthesisCard } from "./synthesis/AtlasSynthesisCard";
export { AtlasSynthesisCardEmpty } from "./synthesis/AtlasSynthesisCardEmpty";
export { AtlasSynthesisCardSkeleton } from "./synthesis/AtlasSynthesisCardSkeleton";

/* notes */
export { AtlasNoteRow } from "./notes/AtlasNoteRow";
export { AtlasNoteEditor } from "./notes/AtlasNoteEditor";
export { AtlasNotesList } from "./notes/AtlasNotesList";

/* materials */
export {
  AtlasMaterialRow,
  type AtlasMaterialRowProps,
  type MaterialKind,
} from "./materials/AtlasMaterialRow";
export { AtlasMaterialsList } from "./materials/AtlasMaterialsList";

/* bookmarks */
export { AtlasBookmarkRow } from "./bookmarks/AtlasBookmarkRow";
export { AtlasBookmarksList } from "./bookmarks/AtlasBookmarksList";

/* chapters */
export { AtlasChapterRow } from "./chapters/AtlasChapterRow";
export { AtlasChaptersList } from "./chapters/AtlasChaptersList";

/* lesson */
export { AtlasLessonHeader } from "./lesson/AtlasLessonHeader";
export { AtlasLessonInfo } from "./lesson/AtlasLessonInfo";
export {
  AtlasLessonStats,
  type LessonStat,
} from "./lesson/AtlasLessonStats";
export { AtlasPlayerWrapper } from "./lesson/AtlasPlayerWrapper";
export {
  AtlasStickyActions,
  type StickyAction,
} from "./lesson/AtlasStickyActions";
