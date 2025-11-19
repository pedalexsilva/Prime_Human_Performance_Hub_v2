import { createServerClient } from "@/lib/supabase/server"
import { initializeDefaultThresholds } from "@/lib/alerts/checker"

interface AutoAssignResult {
  success: boolean
  relationshipCreated: boolean
  thresholdsCreated: boolean
  doctorId?: string
  error?: string
}

// Validar UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Obter ou validar o médico por defeito
async function getDefaultDoctor(supabase: ReturnType<typeof createServerClient>): Promise<string | null> {
  const envId = process.env.DEFAULT_DOCTOR_ID

  if (envId) {
    if (!isValidUUID(envId)) {
      console.error("[v0] DEFAULT_DOCTOR_ID inválido.", envId)
      console.warn("[v0] A usar fallback para o primeiro médico existente.")
    } else {
      console.log("[v0] A usar DEFAULT_DOCTOR_ID:", envId)
      return envId
    }
  }

  console.log("[v0] A procurar médico por fallback.")

  const { data, error } = await (
    await supabase
  )
    .from("profiles")
    .select("id")
    .eq("role", "doctor")
    .order("created_at", { ascending: true })
    .limit(1)
    .single()

  if (error || !data) {
    console.error("[v0] Nenhum médico encontrado.", error)
    return null
  }

  console.log("[v0] Médico fallback encontrado:", data.id)
  return data.id
}

// Verificar se relação já existe
async function relationshipExists(
  supabase: ReturnType<typeof createServerClient>,
  doctorId: string,
  patientId: string,
): Promise<boolean> {
  const { data, error } = await (
    await supabase
  )
    .from("doctor_patient_relationships")
    .select("id")
    .eq("doctor_id", doctorId)
    .eq("patient_id", patientId)
    .maybeSingle()

  if (error) {
    console.error("[v0] Erro ao verificar relação:", error)
    return false
  }

  return data !== null
}

// Criar relação
async function createRelationship(
  supabase: ReturnType<typeof createServerClient>,
  doctorId: string,
  patientId: string,
): Promise<boolean> {
  const { error } = await (
    await supabase
  )
    .from("doctor_patient_relationships")
    .insert({
      doctor_id: doctorId,
      patient_id: patientId,
      status: "active",
    })

  if (error) {
    console.error("[v0] Erro ao criar relação médico-paciente:", error)
    return false
  }

  console.log("[v0] Relação criada:", { doctorId, patientId })
  return true
}

// Garantir que o user é atleta
async function verifyPatientRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<boolean> {
  const { data, error } = await (
    await supabase
  )
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single()

  if (error || !data) {
    console.error("[v0] Falha ao verificar role:", error)
    return false
  }

  return data.role === "athlete"
}

// Inicializar thresholds
async function safeInitializeThresholds(patientId: string, doctorId: string): Promise<boolean> {
  try {
    await initializeDefaultThresholds(patientId, doctorId)
    console.log("[v0] Thresholds iniciais criados com sucesso.")
    return true
  } catch (error) {
    console.error("[v0] Falha ao criar thresholds (não crítico):", error)
    return false
  }
}

// Função principal
export async function autoAssignPatientToDoctor(userId: string): Promise<AutoAssignResult> {
  console.log("[v0] Auto assign. Paciente:", userId)

  const supabase = createServerClient()

  try {
    const isAthlete = await verifyPatientRole(supabase, userId)

    if (!isAthlete) {
      return {
        success: true,
        relationshipCreated: false,
        thresholdsCreated: false,
        error: "User is not an athlete",
      }
    }

    const doctorId = await getDefaultDoctor(supabase)

    if (!doctorId) {
      return {
        success: false,
        relationshipCreated: false,
        thresholdsCreated: false,
        error: "No doctor available",
      }
    }

    const exists = await relationshipExists(supabase, doctorId, userId)

    if (exists) {
      console.log("[v0] Relação já existe. Ignorar.")
      return {
        success: true,
        relationshipCreated: false,
        thresholdsCreated: false,
        doctorId,
        error: "Relationship already exists",
      }
    }

    const created = await createRelationship(supabase, doctorId, userId)

    if (!created) {
      return {
        success: false,
        relationshipCreated: false,
        thresholdsCreated: false,
        error: "Failed to create relationship",
      }
    }

    const thresholdsCreated = await safeInitializeThresholds(userId, doctorId)

    console.log("[v0] Auto assign concluído.", {
      doctorId,
      patientId: userId,
      thresholds: thresholdsCreated,
    })

    return {
      success: true,
      relationshipCreated: true,
      thresholdsCreated,
      doctorId,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"

    console.error("[v0] Erro em auto assign:", msg)

    return {
      success: false,
      relationshipCreated: false,
      thresholdsCreated: false,
      error: msg,
    }
  }
}
