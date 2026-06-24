-- Bucket para PDFs temporários do checklist de habilitação
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'checklist-pdfs',
  'checklist-pdfs',
  true,
  26214400,        -- 25 MB por arquivo
  '{application/pdf}'
)
ON CONFLICT (id) DO NOTHING;

-- Anon pode fazer upload na pasta tmp/
CREATE POLICY "anon upload checklist pdfs"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'checklist-pdfs'
  AND (storage.foldername(name))[1] = 'tmp'
);

-- Leitura pública (Anthropic precisa buscar o PDF via URL)
CREATE POLICY "public read checklist pdfs"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'checklist-pdfs');
