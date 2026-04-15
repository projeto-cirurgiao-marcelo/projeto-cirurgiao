import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  materialsService,
  VideoMaterial,
  MaterialType,
} from '../../services/api/materials.service';
import { Colors as colors } from '../../constants/colors';

interface VideoMaterialsProps {
  videoId: string;
}

export function VideoMaterials({ videoId }: VideoMaterialsProps) {
  const [materials, setMaterials] = useState<VideoMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMaterials();
  }, [videoId]);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const data = await materialsService.getByVideoId(videoId);
      setMaterials(data);
    } catch (err) {
      console.error('Erro ao carregar materiais:', err);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = async (material: VideoMaterial) => {
    try {
      const supported = await Linking.canOpenURL(material.url);
      if (supported) {
        await Linking.openURL(material.url);
      } else {
        Alert.alert(
          'Erro',
          'Não foi possível abrir este link. Verifique se você tem um aplicativo adequado instalado.'
        );
      }
    } catch (err) {
      console.error('Erro ao abrir link:', err);
      Alert.alert('Erro', 'Ocorreu um erro ao abrir o material.');
    }
  };

  const getIconName = (type: MaterialType): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'PDF':
        return 'document-text';
      case 'LINK':
        return 'link';
      case 'ARTICLE':
        return 'newspaper';
      default:
        return 'attach';
    }
  };

  const getIconColor = (type: MaterialType): string => {
    switch (type) {
      case 'PDF':
        return '#dc2626';
      case 'LINK':
        return colors.accent;
      case 'ARTICLE':
        return '#059669';
      default:
        return colors.textMuted;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.loadingText}>Carregando materiais...</Text>
      </View>
    );
  }

  if (materials.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="folder-open-outline" size={32} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Nenhum material disponível</Text>
        <Text style={styles.emptyText}>
          Esta aula não possui materiais complementares.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="folder" size={16} color={colors.accent} />
        <Text style={styles.headerTitle}>Materiais de Apoio</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{materials.length} arquivo{materials.length !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {/* Lista de materiais */}
      {materials.map((material) => (
        <TouchableOpacity
          key={material.id}
          style={styles.materialItem}
          onPress={() => handleOpenLink(material)}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${getIconColor(material.type)}15` },
            ]}
          >
            <Ionicons
              name={getIconName(material.type)}
              size={18}
              color={getIconColor(material.type)}
            />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.materialTitle} numberOfLines={2}>
              {material.title}
            </Text>
            {material.description && (
              <Text style={styles.materialDescription} numberOfLines={1}>
                {material.description}
              </Text>
            )}
            <View style={styles.materialMeta}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>
                  {materialsService.getTypeLabel(material.type)}
                </Text>
              </View>
              {material.fileSize && (
                <Text style={styles.fileSize}>
                  {materialsService.formatFileSize(material.fileSize)}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.actionIcon}>
            <Ionicons
              name={material.type === 'PDF' ? 'download-outline' : 'open-outline'}
              size={16}
              color={colors.accent}
            />
          </View>
        </TouchableOpacity>
      ))}

      {/* Hint */}
      <View style={styles.hint}>
        <Ionicons name="information-circle-outline" size={12} color={colors.textMuted} />
        <Text style={styles.hintText}>
          Toque em um material para abrir ou baixar
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  badge: {
    backgroundColor: colors.accent + '12',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '500',
  },
  materialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: colors.card,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  materialTitle: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  materialDescription: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  materialMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 10,
    color: colors.textMuted,
  },
  actionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.accent + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 4,
  },
  hintText: {
    fontSize: 11,
    color: colors.textMuted,
  },
});

export default VideoMaterials;
