import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import type { CustomerDocumentFile } from '../../services/customer-documents';
import { colors, spacing, typography } from '../../theme';

type DocumentPreviewModalProps = {
  visible: boolean;
  document: CustomerDocumentFile | null;
  loading?: boolean;
  onClose: () => void;
};

function isImage(mimeType: string) {
  return mimeType.startsWith('image/');
}

function isPdf(mimeType: string, fileName: string) {
  return mimeType.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
}

function pdfPreviewHtml(base64: string) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=3" />
    <style>
      html, body { margin: 0; padding: 0; background: #0f172a; }
      #pages { padding: 12px 0 24px; }
      canvas { display: block; width: 100%; margin: 0 auto 12px; background: #fff; }
    </style>
  </head>
  <body>
    <div id="pages"></div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <script>
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const raw = atob(${JSON.stringify(base64)});
      const bytes = new Uint8Array(raw.length);
      for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
      pdfjsLib.getDocument({ data: bytes }).promise.then(async (pdf) => {
        const host = document.getElementById('pages');
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.6 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          host.appendChild(canvas);
          await page.render({ canvasContext: context, viewport }).promise;
        }
      }).catch(() => {
        document.body.innerHTML = '<p style="color:#fff;font-family:sans-serif;padding:24px;">This PDF could not be previewed.</p>';
      });
    </script>
  </body>
</html>`;
}

export function DocumentPreviewModal({
  visible,
  document,
  loading = false,
  onClose,
}: DocumentPreviewModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.bar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12} style={styles.close}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
          <Text numberOfLines={1} style={styles.title}>
            {document?.fileName || 'Document'}
          </Text>
          <View style={styles.close} />
        </View>
        {loading || !document ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primaryCta} />
            <Text style={styles.hint}>Opening document...</Text>
          </View>
        ) : isImage(document.mimeType) ? (
          <Image
            source={{ uri: document.uri }}
            accessibilityLabel={document.fileName}
            style={styles.image}
            resizeMode="contain"
          />
        ) : isPdf(document.mimeType, document.fileName) ? (
          <WebView
            originWhitelist={['*']}
            source={{ html: pdfPreviewHtml(document.base64) }}
            style={styles.webview}
          />
        ) : (
          <View style={styles.centered}>
            <Text style={styles.hint}>Preview is not available for this file type.</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.slate950,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.slate950,
  },
  close: {
    minWidth: 64,
  },
  closeText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.white,
  },
  title: {
    ...typography.body,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  hint: {
    ...typography.caption,
    color: colors.slate400,
    textAlign: 'center',
  },
  image: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.slate950,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.slate950,
  },
});
