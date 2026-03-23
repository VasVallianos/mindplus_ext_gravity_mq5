/*
 * Η ανάλυση του datasheet του MQ5 (SEN0130) — LPG / Natural Gas Sensor
 * έγινε με τη βοήθεια του ClaudeAI. Περισσότερες πληροφορίες για τον
 * αισθητήρα θα βρείτε στο datasheet.
 *
 * CALIBRATION (REQUIRED before first use) 
 * 1. Place sensor in CLEAN air (no gas present).
 * 2. Wait >24 hours warm-up time.
 * 3. Run the calibrateMQ5 block — it prints R0 to Serial.
 * 4. Note the R0 value and use it in getSensorPPM below.
 */
 
enum ANALOG_PORTS {
    //% block="A0"
    A0,
    //% block="A1"
    A1,
	//% block="A2"
    A2,
    //% block="A3"
    A3
}

const RL_VALUE      = 10.0;   
const CLEAN_AIR_FACTOR = 6.5; 
const LPG_A =  1000.0;       
const LPG_B = -2.138;        

//% color="#828165" iconWidth=50 iconHeight=40
namespace mq5sensor {
	//% block="Βαθμονόμηση του MQ5 στο pin [PIN] (καθαρός αέρας — εκτύπωσε R0)" blockType="command"
	//% PIN.shadow="dropdown" PIN.options="ANALOG_PORTS" PIN.defl="ANALOG_PORTS.A1"
	export function calibrateMQ5(parameter: any, block: any) {
		let pin = parameter.PIN.code;
		if (Generator.board === 'arduino') {
			Generator.addInclude("math_h", "#include <math.h>");
			Generator.addInclude("mq5_resistance",
				`float mq5_resistance(int pin) {\n` +
				`  float sum = 0;\n` +
				`  for (int i = 0; i < 50; i++) {\n` +
				`    float v = analogRead(pin) * (5.0 / 1023.0);\n` +
				`    if (v < 0.001) v = 0.001;  // guard divide-by-zero\n` +
				`    sum += (5.0 - v) / v * ${RL_VALUE};\n` +
				`    delay(20);\n` +
				`  }\n` +
				`  return sum / 50.0;\n` +
				`}`
			);
			Generator.addSetup("serial_begin", `Serial.begin(9600);`);
			Generator.addCode(
				`{\n` +
				`  float _rs_air = mq5_resistance(${pin});\n` +
				`  float _r0     = _rs_air / ${CLEAN_AIR_FACTOR};\n` +
				`  Serial.print("MQ5 Calibration — Rs_air = ");\n` +
				`  Serial.print(_rs_air);\n` +
				`  Serial.print(" kOhm  |  R0 = ");\n` +
				`  Serial.print(_r0);\n` +
				`  Serial.println(" kOhm  <-- use this value in the ppm block");\n` +
				`}`
			);
		}
	}

	//% block="Διάβασε συγκέντρωση LPG σε ppm στο pin [PIN] με R0=[R0] kΩ" blockType="reporter"
	//% PIN.shadow="dropdown" PIN.options="ANALOG_PORTS" PIN.defl="ANALOG_PORTS.A1"
	//% R0.shadow="number" R0.defl="10.0"
	export function getLpgPPM(parameter: any, block: any) {
		let pin = parameter.PIN.code;
		let r0  = parameter.R0.code;
		if (Generator.board === 'arduino') {
			Generator.addInclude("math_h", "#include <math.h>");
			Generator.addInclude("mq5_resistance",
				`float mq5_resistance(int pin) {\n` +
				`  float sum = 0;\n` +
				`  for (int i = 0; i < 50; i++) {\n` +
				`    float v = analogRead(pin) * (5.0 / 1023.0);\n` +
				`    if (v < 0.001) v = 0.001;\n` +
				`    sum += (5.0 - v) / v * ${RL_VALUE};\n` +
				`    delay(20);\n` +
				`  }\n` +
				`  return sum / 50.0;\n` +
				`}`
			);
			Generator.addInclude("mq5_ppm",
				`float mq5_ppm(int pin, float r0) {\n` +
				`  float rs    = mq5_resistance(pin);\n` +
				`  float ratio = rs / r0;\n` +
				`  if (ratio <= 0) return -1;  // sensor not ready\n` +
				`  float ppm = ${LPG_A} * pow(ratio, 1.0 / ${LPG_B});\n` +
				`  if (ppm < 0) ppm = 0;\n` +
				`  return ppm;\n` +
				`}`
			);
			Generator.addCode(`mq5_ppm(${pin}, ${r0})`);
		}
	}

	//% block="Διάβασε συγκέντρωση LPG σε ppm στο pin [PIN] (πρόχειρη εκτίμηση-χωρίς βαθμονόμηση)" blockType="reporter"
	//% PIN.shadow="dropdown" PIN.options="ANALOG_PORTS" PIN.defl="ANALOG_PORTS.A1"
	export function getLpgPPMSimple(parameter: any, block: any) {
		let pin = parameter.PIN.code;
		if (Generator.board === 'arduino') {
			Generator.addInclude("mq5_ppm_simple",
				`float mq5_ppm_simple(int pin) {\n` +
				`  float v = analogRead(pin) * (5.0 / 1023.0);\n` +
				`  float ppm = (v - 0.5) * 2177.8 + 200.0;\n` +
				`  if (ppm < 0) ppm = 0;\n` +
				`  return ppm;\n` +
				`}`
			);
			Generator.addCode(`mq5_ppm_simple(${pin})`);
		}
	}

}
