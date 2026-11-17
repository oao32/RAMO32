import 'dotenv/config';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getServiceSupabaseClient(): SupabaseClient | null {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !serviceKey || !url.startsWith('http')) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getGenAIClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function resolvePort(): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      const parsed = Number(args[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    if (args[i].startsWith('--port=')) {
      const parsed = Number(args[i].split('=')[1]);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  if (process.env.NODE_ENV === 'production') {
    const envPort = Number(process.env.PORT);
    if (Number.isFinite(envPort) && envPort > 0) return envPort;
  }
  return 3000;
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const PORT = resolvePort();

  app.use(express.json({ limit: '2mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      model: 'gemini-3.8-flash',
      supabaseAdminProxy: Boolean(getServiceSupabaseClient()),
    });
  });

  // Server-side Admin Subscriber CRUD (uses Service Role key when configured to bypass RLS)
  app.post('/api/admin/subscribers', async (req, res) => {
    const adminSupabase = getServiceSupabaseClient();
    if (!adminSupabase) {
      res.status(501).json({ fallbackToClient: true, error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
      return;
    }

    try {
      const record = req.body?.record;
      if (!record || !record.email || !record.password) {
        res.status(400).json({ error: 'Missing required subscriber email or passcode' });
        return;
      }

      const cleanEmail = String(record.email).trim().toLowerCase();
      const cleanPass = String(record.password).trim();
      const normalizedPlan = record.plan === 'VIP' ? 'VIP' : 'standard';
      const nowIso = new Date().toISOString();
      const clientName = String(record.clientName || 'مشترك').trim();

      const fullSubPayload: Record<string, unknown> = {
        name: clientName,
        email: cleanEmail,
        passcode: cleanPass,
        client_code: record.clientCode || cleanPass,
        tier: normalizedPlan,
        goals: record.visualGoal || null,
        phone: record.phone || null,
        age: record.age ?? null,
        blood_type: record.bloodType || null,
        status: record.status || 'active',
        nutrition_plan_locked: Boolean(record.nutritionPlanLocked),
        inbody_filename: record.inBodyFileName || null,
        inbody_file_url: record.inBodyFileUrl || null,
        updated_at: nowIso,
      };

      const { data: existingSub } = await adminSupabase
        .from('subscribers')
        .select('id')
        .ilike('email', cleanEmail)
        .limit(1)
        .maybeSingle();

      let targetId = String(record.id || '');
      if (existingSub && existingSub.id !== undefined) {
        targetId = String(existingSub.id);
        const { error: subUpdErr } = await adminSupabase
          .from('subscribers')
          .update(fullSubPayload)
          .eq('id', existingSub.id);
        if (subUpdErr && subUpdErr.message.toLowerCase().includes('column')) {
          await adminSupabase
            .from('subscribers')
            .update({
              name: clientName,
              email: cleanEmail,
              passcode: cleanPass,
              tier: normalizedPlan,
              goals: record.visualGoal || null,
            })
            .eq('id', existingSub.id);
        }
      } else {
        const { error: subInsErr } = await adminSupabase
          .from('subscribers')
          .insert({ ...(targetId ? { id: targetId } : {}), ...fullSubPayload });
        if (subInsErr && subInsErr.message.toLowerCase().includes('column')) {
          await adminSupabase.from('subscribers').insert({
            name: clientName,
            email: cleanEmail,
            passcode: cleanPass,
            tier: normalizedPlan,
            goals: record.visualGoal || null,
          });
        }
      }

      const { data: existingClient } = await adminSupabase
        .from('clients')
        .select('id')
        .ilike('email', cleanEmail)
        .limit(1)
        .maybeSingle();

      const resolvedClientId =
        (existingClient && typeof existingClient.id === 'string' ? existingClient.id : '') || targetId;

      const clientPayload: Record<string, unknown> = {
        ...(resolvedClientId ? { id: resolvedClientId } : {}),
        email: cleanEmail,
        name_ar: clientName,
        name_en: clientName,
        subscription_plan: normalizedPlan,
        package_type_ar: normalizedPlan === 'VIP' ? 'الباقة البلاتينية (VIP)' : 'الباقة القياسية (Standard)',
        package_type_en: normalizedPlan,
        phone: record.phone || null,
        client_code: record.clientCode || cleanPass,
        status: record.status || 'active',
        assigned_password: cleanPass,
        age: record.age ?? null,
        blood_type: record.bloodType || null,
        visual_goal: record.visualGoal || null,
        nutrition_plan_locked: Boolean(record.nutritionPlanLocked),
        inbody_filename: record.inBodyFileName || null,
        inbody_file_url: record.inBodyFileUrl || null,
      };

      if (existingClient?.id) {
        const { id: _omit, ...updPayload } = clientPayload;
        await adminSupabase.from('clients').update(updPayload).eq('id', existingClient.id);
      } else {
        await adminSupabase.from('clients').insert(clientPayload);
      }

      await adminSupabase.from('workouts').upsert(
        {
          id: `auth_${cleanEmail}`,
          client_id: resolvedClientId || cleanEmail,
          day_key: 'client_auth',
          workout_data: { ...record, id: resolvedClientId || record.id, syncedToSupabase: true },
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );

      res.json({ success: true, id: resolvedClientId || targetId });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Service role subscriber sync failed',
      });
    }
  });

  app.patch('/api/admin/subscribers/flags', async (req, res) => {
    const adminSupabase = getServiceSupabaseClient();
    if (!adminSupabase) {
      res.status(501).json({ fallbackToClient: true });
      return;
    }

    try {
      const { email, status, nutritionPlanLocked, updatedRecord } = req.body || {};
      const cleanEmail = String(email || '').trim().toLowerCase();
      if (!cleanEmail) {
        res.status(400).json({ error: 'Missing email' });
        return;
      }

      const updatesSub: Record<string, unknown> = {};
      const updatesClient: Record<string, unknown> = {};
      if (status !== undefined) {
        updatesSub.status = status;
        updatesClient.status = status;
      }
      if (nutritionPlanLocked !== undefined) {
        updatesSub.nutrition_plan_locked = Boolean(nutritionPlanLocked);
        updatesClient.nutrition_plan_locked = Boolean(nutritionPlanLocked);
      }

      await Promise.all([
        adminSupabase.from('subscribers').update(updatesSub).ilike('email', cleanEmail),
        adminSupabase.from('clients').update(updatesClient).ilike('email', cleanEmail),
        updatedRecord
          ? adminSupabase.from('workouts').upsert(
              {
                id: `auth_${cleanEmail}`,
                client_id: updatedRecord.id || cleanEmail,
                day_key: 'client_auth',
                workout_data: updatedRecord,
                updated_at: updatedRecord.updatedAt || new Date().toISOString(),
              },
              { onConflict: 'id' }
            )
          : Promise.resolve(),
      ]);

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Update flags failed' });
    }
  });

  app.delete('/api/admin/subscribers', async (req, res) => {
    const adminSupabase = getServiceSupabaseClient();
    if (!adminSupabase) {
      res.status(501).json({ fallbackToClient: true });
      return;
    }

    try {
      const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
      const candidateId = req.body?.id ? String(req.body.id) : undefined;
      if (!cleanEmail) {
        res.status(400).json({ error: 'Missing email' });
        return;
      }

      await Promise.all([
        adminSupabase.from('subscribers').delete().ilike('email', cleanEmail),
        adminSupabase.from('clients').delete().ilike('email', cleanEmail),
        adminSupabase.from('declarations').delete().ilike('email', cleanEmail),
        adminSupabase.from('workouts').delete().eq('id', `auth_${cleanEmail}`),
      ]);

      const keys = [candidateId, cleanEmail].filter((k): k is string => Boolean(k));
      for (const k of keys) {
        await Promise.all([
          adminSupabase.from('workouts').delete().eq('client_id', k),
          adminSupabase.from('notes').delete().eq('client_id', k),
          adminSupabase.from('profiles').delete().eq('id', k),
        ]);
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Delete failed' });
    }
  });

  // AI Workout & Nutrition Plan Generation Endpoint
  app.post('/api/ai/generate-plan', async (req, res) => {
    try {
      const {
        planType = 'workout',
        profile,
        goal = 'recomp',
        customNotes = '',
      } = req.body || {};

      if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({
          error: 'GEMINI_API_KEY is not configured on the server.',
        });
        return;
      }

      const ai = getGenAIClient();

      const athleteName = profile?.name || 'المشترك';
      const weight = profile?.weight ?? 75;
      const height = profile?.height ?? 175;
      const muscleMass = profile?.muscleMass ?? 33;
      const bodyFat = profile?.bodyFat ?? 20;
      const targetWeight = profile?.targetWeight ?? 70;
      const currentCalories = profile?.dailyCalories ?? 2100;

      const goalLabels: Record<string, string> = {
        hypertrophy: 'بناء كتلة عضلية صافية (Clean Hypertrophy & Muscle Gain)',
        cutting: 'تنشيف وحرق الدهون مع الحفاظ على العضل (Fat Loss & Cutting)',
        recomp: 'إعادة تشكيل الجسم وبناء العضل مع خفض الدهون (Body Recomposition)',
        strength: 'تطوير القوة القصوى والأداء الرياضي (Strength & Power)',
      };
      const selectedGoalDesc = goalLabels[goal] || goalLabels.recomp;

      const modelName = 'gemini-3.8-flash';

      if (planType === 'nutrition') {
        const promptInput = [
          `تصميم برنامج غذائي وماكروز احترافي للمشترك: ${athleteName}`,
          `القياسات الحيوية: الوزن ${weight} كجم، الطول ${height} سم، الكتلة العضلية ${muscleMass} كجم، نسبة الدهون ${bodyFat}%، الوزن المستهدف ${targetWeight} كجم، السعرات الحالية ${currentCalories} سعرة.`,
          `الهدف التدريبي: ${selectedGoalDesc}.`,
          customNotes ? `ملاحظات وتفضيلات إضافية: ${customNotes}` : '',
          `يرجى توليد خطة غذائية يومية متكاملة من 4 وجبات محسوبة السعرات والماكروز بدقة باللغتين العربية والإنجليزية مع توصيات الاستشفاء وشرب الماء.`,
        ]
          .filter(Boolean)
          .join('\n');

        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptInput,
          config: {
            systemInstruction:
              'أنت خبير تغذية رياضية ومدرب محترف في منظومة OAO (Own Aura Outcome) بإشراف الكوتش عمر عدنان. صمم خططاً غذائية علمية دقيقة وعملية محسوبة الماكروز والسعرات تناسب قياسات المشترك وهدفه.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                titleAr: { type: Type.STRING },
                titleEn: { type: Type.STRING },
                summaryAr: { type: Type.STRING },
                summaryEn: { type: Type.STRING },
                recommendationsAr: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                recommendationsEn: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                nutritionPlan: {
                  type: Type.OBJECT,
                  properties: {
                    dailyCalories: { type: Type.INTEGER },
                    protein: { type: Type.INTEGER },
                    carbs: { type: Type.INTEGER },
                    fats: { type: Type.INTEGER },
                    waterLiters: { type: Type.NUMBER },
                    meals: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          mealNameAr: { type: Type.STRING },
                          mealNameEn: { type: Type.STRING },
                          timingAr: { type: Type.STRING },
                          timingEn: { type: Type.STRING },
                          calories: { type: Type.INTEGER },
                          protein: { type: Type.INTEGER },
                          carbs: { type: Type.INTEGER },
                          fats: { type: Type.INTEGER },
                          itemsAr: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                          itemsEn: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                          },
                        },
                        required: [
                          'mealNameAr',
                          'mealNameEn',
                          'timingAr',
                          'timingEn',
                          'calories',
                          'protein',
                          'carbs',
                          'fats',
                          'itemsAr',
                          'itemsEn',
                        ],
                      },
                    },
                  },
                  required: [
                    'dailyCalories',
                    'protein',
                    'carbs',
                    'fats',
                    'waterLiters',
                    'meals',
                  ],
                },
              },
              required: [
                'titleAr',
                'titleEn',
                'summaryAr',
                'summaryEn',
                'recommendationsAr',
                'recommendationsEn',
                'nutritionPlan',
              ],
            },
          },
        });

        const rawText = response.text || '{}';
        const parsed = JSON.parse(rawText);
        const promptTokens = response.usageMetadata?.promptTokenCount ?? 0;
        const completionTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
        const totalTokens =
          response.usageMetadata?.totalTokenCount ?? promptTokens + completionTokens;

        res.json({
          plan: {
            ...parsed,
            planType: 'nutrition',
            modelName,
            promptInput,
            promptTokens,
            completionTokens,
            totalTokens,
          },
        });
        return;
      }

      // Default: Workout Plan Generation
      const promptInput = [
        `تصميم برنامج تدريبي احترافي مخصص للمشترك: ${athleteName}`,
        `القياسات الحيوية: الوزن ${weight} كجم، الطول ${height} سم، الكتلة العضلية ${muscleMass} كجم، نسبة الدهون ${bodyFat}%، الوزن المستهدف ${targetWeight} كجم.`,
        `الهدف التدريبي: ${selectedGoalDesc}.`,
        customNotes ? `ملاحظات وإصابات أو تفضيلات: ${customNotes}` : '',
        `قم ببناء جدول تدريبي علمي مقسم إلى 4 أيام أساسية (push, pull, legs, upper) مع 4 تمارين دقيقة لكل يوم تشمل الجلسات والتكرارات والأوزان المقترحة وفترات الراحة ونصائح الأداء باللغتين العربية والإنجليزية.`,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: modelName,
        contents: promptInput,
        config: {
          systemInstruction:
            'أنت كبير مدربي القوة والتحول البدني في منظومة OAO (Own Aura Outcome) بإشراف الكوتش عمر عدنان. صمم جداول تدريبية احترافية مبنية على أسس الميكانيكا الحيوية والزيادة التدريجية للأحمال (Progressive Overload). التزم بمفاتيح الأيام: push و pull و legs و upper.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              titleAr: { type: Type.STRING },
              titleEn: { type: Type.STRING },
              summaryAr: { type: Type.STRING },
              summaryEn: { type: Type.STRING },
              recommendationsAr: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              recommendationsEn: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              workoutDays: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: {
                      type: Type.STRING,
                      description: 'Must be one of: push, pull, legs, upper',
                    },
                    titleAr: { type: Type.STRING },
                    titleEn: { type: Type.STRING },
                    subtitleAr: { type: Type.STRING },
                    subtitleEn: { type: Type.STRING },
                    exercises: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          nameAr: { type: Type.STRING },
                          nameEn: { type: Type.STRING },
                          targetMuscleAr: { type: Type.STRING },
                          targetMuscleEn: { type: Type.STRING },
                          setsCount: { type: Type.INTEGER },
                          repsRange: { type: Type.STRING },
                          targetWeightKg: { type: Type.NUMBER },
                          restSeconds: { type: Type.INTEGER },
                          tipAr: { type: Type.STRING },
                          tipEn: { type: Type.STRING },
                        },
                        required: [
                          'nameAr',
                          'nameEn',
                          'targetMuscleAr',
                          'targetMuscleEn',
                          'setsCount',
                          'repsRange',
                          'targetWeightKg',
                          'restSeconds',
                          'tipAr',
                          'tipEn',
                        ],
                      },
                    },
                  },
                  required: ['key', 'titleAr', 'titleEn', 'subtitleAr', 'subtitleEn', 'exercises'],
                },
              },
            },
            required: [
              'titleAr',
              'titleEn',
              'summaryAr',
              'summaryEn',
              'recommendationsAr',
              'recommendationsEn',
              'workoutDays',
            ],
          },
        },
      });

      const rawText = response.text || '{}';
      const parsed = JSON.parse(rawText);
      const promptTokens = response.usageMetadata?.promptTokenCount ?? 0;
      const completionTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
      const totalTokens =
        response.usageMetadata?.totalTokenCount ?? promptTokens + completionTokens;

      res.json({
        plan: {
          ...parsed,
          planType: 'workout',
          modelName,
          promptInput,
          promptTokens,
          completionTokens,
          totalTokens,
        },
      });
    } catch (err) {
      console.error('Gemini Plan Generation Error:', err);
      const message =
        err instanceof Error ? err.message : 'حدث خطأ أثناء توليد البرنامج بالذكاء الاصطناعي';
      res.status(500).json({ error: message });
    }
  });

  // Mount Vite middleware in development or serve built static assets in production
  if (process.env.NODE_ENV !== 'production') {
    const vitePromise = createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });

    vitePromise.catch((err) => {
      console.error('Vite dev server initialization error:', err);
    });

    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.on('error', (err) => {
    console.error(`Server failed to bind on port ${PORT}:`, err);
    process.exit(1);
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`OAO Training Portal Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
