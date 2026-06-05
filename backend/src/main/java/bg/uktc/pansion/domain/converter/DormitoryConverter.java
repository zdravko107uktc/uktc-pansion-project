package bg.uktc.pansion.domain.converter;

import bg.uktc.pansion.domain.enums.Dormitory;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class DormitoryConverter implements AttributeConverter<Dormitory, String> {

    @Override
    public String convertToDatabaseColumn(Dormitory attribute) {
        return attribute == null ? null : attribute.getValue();
    }

    @Override
    public Dormitory convertToEntityAttribute(String dbData) {
        return Dormitory.fromValue(dbData);
    }
}
