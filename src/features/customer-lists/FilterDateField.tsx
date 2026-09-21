import { DatePickerField } from '../../components';

type FilterFieldProps = {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
};

export function FilterDateField({
  label,
  value,
  placeholder = 'Select date',
  onChange,
}: FilterFieldProps) {
  return (
    <DatePickerField
      label={label}
      value={value}
      placeholder={placeholder}
      allowClear
      onChange={onChange}
    />
  );
}
