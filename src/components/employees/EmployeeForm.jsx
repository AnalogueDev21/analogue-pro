// src/components/employees/EmployeeForm.jsx
import { useTranslation } from 'react-i18next'
import { Button, Drawer, Field, Input, Select } from '@/components/ui/index.jsx'
import { choose, fieldName } from '@/utils/lang'

export default function EmployeeForm({
  open, onClose, editItem, form, setForm,
  errors, saving, onSave,
  branches, departments, positions, roles, employees,
}) {
  const { t, i18n } = useTranslation()
  if (!open) return null

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }))

  return (
    <Drawer
      title={editItem ? t('employee.edit') : t('employee.add')}
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-5">
        {/* Personal */}
        <section>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {choose(i18n, 'ข้อมูลส่วนตัว', 'Personal Information')}
          </p>
          <div className="space-y-3">
            <Field label={t('employee.code')} required error={errors.employee_code}>
              <Input value={form.employee_code} onChange={e => f('employee_code', e.target.value)}
                placeholder="EMP-0001" error={errors.employee_code} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={choose(i18n, 'ชื่อ (ไทย)', 'First Name')} required error={errors.first_name}>
                <Input value={form.first_name} onChange={e => f('first_name', e.target.value)}
                  placeholder={choose(i18n, 'สมชาย', 'John')} error={errors.first_name} />
              </Field>
              <Field label={choose(i18n, 'นามสกุล (ไทย)', 'Last Name')} required error={errors.last_name}>
                <Input value={form.last_name} onChange={e => f('last_name', e.target.value)}
                  placeholder={choose(i18n, 'ใจดี', 'Doe')} error={errors.last_name} />
              </Field>
              <Field label="First Name (EN)">
                <Input value={form.first_name_en} onChange={e => f('first_name_en', e.target.value)} placeholder="John" />
              </Field>
              <Field label="Last Name (EN)">
                <Input value={form.last_name_en} onChange={e => f('last_name_en', e.target.value)} placeholder="Doe" />
              </Field>
              <Field label={t('employee.email')} required error={errors.email}>
                <Input type="email" value={form.email} onChange={e => f('email', e.target.value)}
                  placeholder="john@company.com" error={errors.email} />
              </Field>
              <Field label={t('employee.phone')}>
                <Input value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="08X-XXX-XXXX" />
              </Field>
              <Field label={t('employee.gender')}>
                <Select value={form.gender} onChange={e => f('gender', e.target.value)}>
                  <option value="">— {choose(i18n, 'ไม่ระบุ', 'Not specified')} —</option>
                  <option value="male">{t('employee.genders.male')}</option>
                  <option value="female">{t('employee.genders.female')}</option>
                  <option value="other">{t('employee.genders.other')}</option>
                  <option value="prefer_not_to_say">{t('employee.genders.prefer_not_to_say')}</option>
                </Select>
              </Field>
              <Field label={t('employee.dob')}>
                <Input type="date" value={form.date_of_birth} onChange={e => f('date_of_birth', e.target.value)} />
              </Field>
            </div>
            <Field label={t('employee.nationalId')}>
              <Input value={form.national_id} onChange={e => f('national_id', e.target.value)} placeholder="1-XXXX-XXXXX-XX-X" />
            </Field>
          </div>
        </section>

        {/* Organization */}
        <section>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {choose(i18n, 'ข้อมูลองค์กร', 'Organization')}
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('employee.branch')}>
                <Select value={form.branch_id} onChange={e => f('branch_id', e.target.value)}>
                  <option value="">— {choose(i18n, 'เลือกสาขา', 'Select branch')} —</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{fieldName(i18n, b)} ({b.code})</option>)}
                </Select>
              </Field>
              <Field label={t('employee.department')}>
                <Select value={form.department_id} onChange={e => f('department_id', e.target.value)}>
                  <option value="">— {choose(i18n, 'เลือกแผนก', 'Select dept')} —</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{fieldName(i18n, d)}</option>)}
                </Select>
              </Field>
              <Field label={t('employee.position')}>
                <Select value={form.position_id} onChange={e => f('position_id', e.target.value)}>
                  <option value="">— {choose(i18n, 'เลือกตำแหน่ง', 'Select position')} —</option>
                  {positions.map(p => <option key={p.id} value={p.id}>{fieldName(i18n, p)}</option>)}
                </Select>
              </Field>
              <Field label="Role">
                <Select value={form.role_id} onChange={e => f('role_id', e.target.value)}>
                  <option value="">— {choose(i18n, 'เลือก Role', 'Select Role')} —</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </Select>
              </Field>
            </div>
            <Field label={t('employee.manager')}>
              <Select value={form.manager_id} onChange={e => f('manager_id', e.target.value)}>
                <option value="">— {choose(i18n, 'ไม่มีหัวหน้างาน', 'No manager')} —</option>
                {employees.filter(e => e.id !== editItem?.id).map(e => (
                  <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</option>
                ))}
              </Select>
            </Field>
          </div>
        </section>

        {/* Employment */}
        <section>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {choose(i18n, 'ข้อมูลการจ้างงาน', 'Employment')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('employee.employmentType')}>
              <Select value={form.employment_type} onChange={e => f('employment_type', e.target.value)}>
                <option value="full_time">{t('employee.types.full_time')}</option>
                <option value="part_time">{t('employee.types.part_time')}</option>
                <option value="contract">{t('employee.types.contract')}</option>
                <option value="intern">{t('employee.types.intern')}</option>
              </Select>
            </Field>
            <Field label={t('employee.status')}>
              <Select value={form.status} onChange={e => f('status', e.target.value)}>
                <option value="active">{t('employee.statuses.active')}</option>
                <option value="probation">{t('employee.statuses.probation')}</option>
                <option value="on_leave">{t('employee.statuses.on_leave')}</option>
                <option value="inactive">{t('employee.statuses.inactive')}</option>
                <option value="terminated">{t('employee.statuses.terminated')}</option>
              </Select>
            </Field>
            <Field label={t('employee.hireDate')} required>
              <Input type="date" value={form.hire_date} onChange={e => f('hire_date', e.target.value)} />
            </Field>
            <Field label={t('employee.probationEnd')}>
              <Input type="date" value={form.probation_end_date} onChange={e => f('probation_end_date', e.target.value)} />
            </Field>
          </div>
        </section>
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
        <Button variant="secondary" className="flex-1" onClick={onClose}>{t('common.cancel')}</Button>
        <Button className="flex-1" loading={saving} onClick={onSave}>{t('common.save')}</Button>
      </div>
    </Drawer>
  )
}
